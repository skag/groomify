import json
import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logger import get_logger, setup_logging
from app.api import auth, business_users, agreements, animal_types, service_categories, services, customers, pets, appointments



def create_app() -> FastAPI:
    """Create and configure FastAPI application"""

    # Initialize logging
    setup_logging()
    logger = get_logger("app.startup")

    logger.info("Creating FastAPI application")

    app = FastAPI(
        title="Groomify API",
        description="API for the Groomify platform",
        version="0.1.0",
        redirect_slashes=False,  # Disable automatic trailing slash redirects (307)
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        """Custom handler for Pydantic validation errors to provide detailed logging"""
        logger.error("=" * 80)
        logger.error("VALIDATION ERROR OCCURRED")
        logger.error(f"URL: {request.url}")
        logger.error(f"Method: {request.method}")

        # Log detailed validation errors
        logger.error("Validation Error Details:")
        for error in exc.errors():
            logger.error(
                f"  - Field: {'.'.join(str(loc) for loc in error['loc'])}"
            )
            logger.error(f"    Type: {error['type']}")
            logger.error(f"    Message: {error['msg']}")
            if "ctx" in error:
                logger.error(f"    Context: {error['ctx']}")

        # Log request body that caused validation error
        try:
            body = exc.body
            if body:
                if isinstance(body, bytes):
                    body = body.decode()
                if isinstance(body, str):
                    try:
                        body_json = json.loads(body)
                        logger.error(
                            "Request Body (causing validation error):"
                        )
                        logger.error(json.dumps(body_json, indent=2))
                    except json.JSONDecodeError:
                        logger.error(f"Request Body (raw): {body}")
                else:
                    logger.error(f"Request Body: {body}")
        except Exception as e:
            logger.error(f"Could not log request body: {e}")

        logger.error("=" * 80)

        # Return the validation error response
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )

    cors_regex = (
        r"http://.*\.localhost:3000"
        if settings.is_development
        else r"https://.*"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=cors_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Log CORS configuration
    logger.info(
        "CORS middleware configured",
        extra={
            "cors_origins": settings.cors_origins,
            "cors_regex": cors_regex,
            "development_mode": settings.is_development,
        },
    )

    # Consolidated request/response logging middleware (only when DEBUG=true)
    if settings.DEBUG:
        debug_logger = get_logger("app.debug")

        @app.middleware("http")
        async def consolidated_request_logging_middleware(request: Request, call_next):
            """Consolidated middleware for request and response logging when DEBUG=true"""
            request_id = str(uuid.uuid4())

            # Log request start
            debug_logger.info("=" * 80)
            debug_logger.info(f"[{request_id}] REQUEST START: {request.method} {request.url.path}")
            debug_logger.info(f"[{request_id}] Full URL: {request.url}")
            debug_logger.info(f"[{request_id}] Client: {request.client.host if request.client else 'Unknown'}")

            # Log headers (excluding sensitive ones)
            sensitive_headers = {"authorization", "cookie", "x-api-key"}
            headers_to_log = {
                k: v for k, v in request.headers.items()
                if k.lower() not in sensitive_headers
            }

            # Log authorization header presence (but not the token value)
            auth_header = request.headers.get("authorization", "")
            if auth_header:
                debug_logger.info(f"[{request_id}] Authorization: Bearer <token present>")
            else:
                debug_logger.info(f"[{request_id}] Authorization: <missing>")

            if headers_to_log:
                debug_logger.info(f"[{request_id}] Headers: {json.dumps(headers_to_log, indent=2)}")

            # Log query parameters
            if request.query_params:
                debug_logger.info(f"[{request_id}] Query Params: {dict(request.query_params)}")

            # Log request body for POST, PUT, PATCH (consume body only once)
            if request.method in ["POST", "PUT", "PATCH"]:
                try:
                    body = await request.body()

                    if body:
                        # Try to parse as JSON for pretty printing
                        try:
                            body_json = json.loads(body.decode())
                            debug_logger.info(f"[{request_id}] Request Body (JSON):\n{json.dumps(body_json, indent=2)}")
                        except (json.JSONDecodeError, UnicodeDecodeError):
                            # If not JSON or can't decode, log as string (limit to 1000 chars)
                            debug_logger.info(f"[{request_id}] Request Body (raw): {body[:1000]}...")
                    else:
                        debug_logger.info(f"[{request_id}] Request Body: <empty>")

                    # Cache body so downstream `await request.body()` returns it
                    request._body = body
                except Exception as e:
                    debug_logger.error(f"[{request_id}] Failed to read request body: {e}")

            debug_logger.info(f"[{request_id}] " + "-" * 60)

            # Process request and measure time
            start_time = time.time()

            try:
                response = await call_next(request)
                process_time = time.time() - start_time

                # Log response details
                debug_logger.info(f"[{request_id}] RESPONSE")
                debug_logger.info(f"[{request_id}] Status Code: {response.status_code}")
                debug_logger.info(f"[{request_id}] Process Time: {process_time:.4f}s")
                debug_logger.info(f"[{request_id}] Response Headers: {dict(response.headers)}")

                # Log response body for error status codes
                if response.status_code >= 400:
                    try:
                        if hasattr(response, "body"):
                            response_body = response.body
                            if response_body:
                                try:
                                    body_json = json.loads(response_body.decode())
                                    debug_logger.info(
                                        f"[{request_id}] Response Body: {json.dumps(body_json, indent=2)}"
                                    )
                                except Exception:
                                    debug_logger.info(
                                        f"[{request_id}] Response Body: {response_body.decode()}"
                                    )
                            else:
                                debug_logger.info(f"[{request_id}] Response Body: <empty>")
                        else:
                            # Try to read streaming response for payment-terms errors
                            if response.status_code == 400 and "payment-terms" in str(request.url):
                                try:
                                    body_bytes = b""
                                    async for chunk in response.body_iterator:
                                        body_bytes += chunk
                                    debug_logger.error(f"[{request_id}] 400 ERROR Response Body: {body_bytes.decode()}")
                                except Exception as stream_err:
                                    debug_logger.error(f"[{request_id}] Could not read streaming body: {stream_err}")
                            debug_logger.info(f"[{request_id}] Response Body: <streaming response>")
                    except Exception as e:
                        debug_logger.error(f"[{request_id}] Could not read response body: {e}")

                debug_logger.info(f"[{request_id}] REQUEST END")
                debug_logger.info("=" * 80)

                return response
            except Exception as e:
                process_time = time.time() - start_time
                debug_logger.error(f"[{request_id}] REQUEST FAILED after {process_time:.4f}s: {e}")
                debug_logger.info("=" * 80)
                raise

        logger.info("Consolidated request logging middleware enabled (DEBUG=true)")
    else:
        logger.info("Debug request logging disabled (DEBUG=false)")





    # Register API routers
    app.include_router(auth.router, prefix="/api")
    app.include_router(business_users.router, prefix="/api")
    app.include_router(agreements.router, prefix="/api")
    app.include_router(animal_types.router, prefix="/api")
    app.include_router(service_categories.router, prefix="/api")
    app.include_router(services.router, prefix="/api")
    app.include_router(customers.router, prefix="/api")
    app.include_router(pets.router, prefix="/api")
    app.include_router(appointments.router, prefix="/api")
    logger.info("Registered routers: auth, business_users, agreements, animal_types, service_categories, services, customers, pets, appointments")

    @app.get("/health")
    async def health_check():
        """Health check endpoint for load balancers and monitoring"""
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }






    logger.info("FastAPI application created successfully")
    return app


# Create the app instance for uvicorn to find
app = create_app()
