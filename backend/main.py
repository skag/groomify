import click
import uvicorn


@click.group()
def cli():
    """Freedom Backend CLI"""
    pass


@cli.command()
@click.option("--host", default="0.0.0.0")
@click.option("--port", default=8000)
@click.option("--workers", default=1)
@click.option("--production", is_flag=True, help="Run in production mode")
def serve(host, port, workers, production):
    """Start the API server"""
    reload = not production  # Auto-reload unless production mode

    uvicorn.run(
        "app.web_app:app",
        host=host,
        port=port,
        reload=reload,
        workers=workers if production else 1,
        log_level="info" if production else "debug",
    )


if __name__ == "__main__":
    cli()
