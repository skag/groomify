"""
Seed script to generate dummy customers, customer_users, and pets using Faker.

Usage:
    cd backend
    uv run python scripts/seed_customers.py --business-id 1 --num-customers 10

    Or set environment variable:
    SEED_BUSINESS_ID=1 uv run python scripts/seed_customers.py --num-customers 10
"""

import json
import os
import random
import sys
from pathlib import Path

import click
from faker import Faker

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.pet import Pet
from app.models.business import Business

# Initialize Faker
fake = Faker()

# Load dog breeds from JSON file
SCRIPT_DIR = Path(__file__).parent
with open(SCRIPT_DIR / "dogbreeds.json") as f:
    DOG_BREEDS = json.load(f)["breed"]

# Pet names derived from NYC DOH dog licensing data (dariusk/corpora).
PET_NAMES = [
    "Bella",
    "Max",
    "Charlie",
    "Coco",
    "Lola",
    "Rocky",
    "Buddy",
    "Lucy",
    "Lucky",
    "Daisy",
    "Luna",
    "Bailey",
    "Princess",
    "Teddy",
    "Chloe",
    "Toby",
    "Molly",
    "Jack",
    "Milo",
    "Oliver",
    "Maggie",
    "Penny",
    "Sophie",
    "Lily",
    "Cooper",
    "Oreo",
    "Mia",
    "Leo",
    "Cookie",
    "Lulu",
    "Ruby",
    "Stella",
    "Prince",
    "Gizmo",
    "Ginger",
    "Riley",
    "Rosie",
    "Roxy",
    "Sasha",
    "Cody",
    "Lady",
    "Sadie",
    "Oscar",
    "Zoey",
    "Buster",
    "Baby",
    "Shadow",
    "Jake",
    "Bruno",
    "Zoe",
    "Henry",
    "Sammy",
    "Pepper",
    "Bear",
    "Blue",
    "Rocco",
    "Duke",
    "Louie",
    "Peanut",
    "Frankie",
    "Dexter",
    "Gracie",
    "King",
    "Sandy",
    "Honey",
    "Benji",
    "Bentley",
    "Rex",
    "Scout",
    "Sparky",
    "Zeus",
    "Brooklyn",
    "Harley",
    "Rusty",
    "Winston",
    "Sam",
    "Emma",
    "Jasper",
    "Snoopy",
    "Lilly",
    "Angel",
    "George",
    "Bandit",
    "Romeo",
    "Jax",
    "Layla",
    "Olive",
    "Minnie",
    "Abby",
    "Tucker",
    "Simba",
    "Jackson",
    "Brownie",
    "Nala",
    "Lexi",
    "Hazel",
    "Murphy",
    "Mickey",
    "Diamond",
    "Hudson",
    "Gigi",
    "Maximus",
    "Tyson",
    "Hunter",
    "Madison",
    "Ella",
    "Ellie",
    "Mimi",
    "Gus",
    "Maya",
    "Chewy",
    "Joey",
    "Missy",
    "Ace",
    "Chester",
    "Baxter",
    "Remy",
    "Precious",
    "Pebbles",
    "Casey",
    "Harry",
    "Ollie",
    "Fluffy",
    "Benny",
    "Roxie",
    "Marley",
    "Ziggy",
    "Annie",
    "Mocha",
    "Otis",
    "Piper",
    "Belle",
    "Spike",
    "Chase",
    "Apollo",
    "Chico",
    "Sugar",
    "Archie",
    "Nina",
    "Mr.",
    "Loki",
    "Phoebe",
    "Smokey",
    "Name",
    "Bruce",
    "Biscuit",
    "Cocoa",
    "Rufus",
    "Thor",
    "Diesel",
    "Nena",
    "Trixie",
    "Penelope",
    "Samson",
    "Rudy",
    "Holly",
    "Finn",
    "Happy",
    "Samantha",
    "Not",
    "Dakota",
    "Elvis",
    "Brandy",
    "Sunny",
    "Foxy",
    "Parker",
    "Simon",
    "Willow",
    "Millie",
    "Betty",
    "Izzy",
    "Casper",
    "Mason",
    "Tiger",
    "Hershey",
    "Petey",
    "Sonny",
    "Bobby",
    "Gucci",
    "Dixie",
    "Little",
    "Yogi",
    "Winnie",
    "Luke",
    "Maddie",
    "Kobe",
    "Hank",
    "Blu",
    "Boomer",
    "Kiki",
    "Fiona",
    "Rambo",
    "Muffin",
    "Boo",
    "Alfie",
    "Katie",
    "Wally",
    "Cosmo",
    "Onyx",
    "Mochi",
    "Tiny",
    "Shea",
    "Junior",
    "Otto",
    "Snowball",
    "Sophia",
    "Ozzy",
    "Nikki",
    "Chance",
    "Sky",
    "Chewie",
    "Ava",
    "Jackie",
    "Star",
    "Hugo",
    "Misty",
    "Champ",
    "Bonnie",
    "Hercules",
    "Cinnamon",
    "Roscoe",
    "Andy",
    "Delilah",
    "Logan",
    "Reggie",
    "Scooby",
    "Spencer",
    "Ricky",
    "Maxwell",
    "Lexie",
    "Monty",
    "Cash",
    "Brody",
    "Barney",
    "Nico",
    "Midnight",
    "Olivia",
    "Bosco",
    "Beau",
    "Mikey",
    "Jasmine",
    "Xena",
    "Charlotte",
    "Walter",
    "Niko",
    "Callie",
    "Stanley",
    "Moose",
    "Lucas",
    "Paris",
    "Panda",
    "Willie",
    "Spanky",
    "Chip",
    "Luca",
    "Josie",
    "Cassie",
    "Watson",
    "Chelsea",
    "Dino",
    "Koko",
    "Miles",
    "Snowy",
    "Brady",
    "Enzo",
    "Cleo",
    "Chanel",
    "Grace",
    "Sebastian",
    "Isabella",
    "Athena",
    "Jessie",
    "Snow",
    "Louis",
    "Bowie",
    "Charley",
    "Jojo",
    "Bo",
    "Scruffy",
    "Diego",
    "Bambi",
    "Dusty",
    "Koda",
    "Amber",
    "Dolly",
    "Scrappy",
    "Lacey",
    "Billy",
    "Patches",
    "Jesse",
    "Brutus",
    "Poppy",
    "Nemo",
    "Mabel",
    "Storm",
    "Theodore",
    "Pumpkin",
    "Yoshi",
    "Theo",
    "Bernie",
    "Tommy",
    "Taz",
    "Dante",
    "Clyde",
    "Scooter",
    "Violet",
    "Duncan",
    "Miss",
    "Cindy",
    "Bobo",
    "Sheba",
    "Shelby",
    "Ben",
    "Heidi",
    "Sassy",
    "Sir",
    "Matilda",
    "Diva",
    "Murray",
    "Fred",
    "April",
    "Eddie",
    "Tiffany",
    "Dolce",
    "Alex",
    "Tony",
    "Winter",
    "Dylan",
    "Ranger",
    "Skye",
    "Noah",
    "Gia",
    "Dallas",
    "Pippa",
    "Sally",
    "Goldie",
    "Lila",
    "Nellie",
    "Baci",
    "Mojo",
    "Cali",
    "Benjamin",
    "Bubba",
    "Napoleon",
    "Linda",
    "Juno",
    "Georgia",
    "Kona",
    "Summer",
    "Sydney",
    "Harvey",
    "Jerry",
    "Candy",
    "Khloe",
    "Zelda",
    "Harper",
    "Eli",
    "Peaches",
    "Jade",
    "Chewbacca",
    "Franklin",
    "Jimmy",
    "Scarlett",
    "Mugsy",
    "Sofia",
    "Ozzie",
    "Guinness",
    "Tootsie",
    "Suki",
    "Rocket",
    "Tyler",
    "Major",
    "Paco",
    "Frank",
    "Abigail",
    "Buttercup",
    "Momo",
    "Snickers",
    "Bebe",
    "Chocolate",
    "Linus",
    "Tina",
    "Pepe",
    "Duchess",
    "Mookie",
    "Bubbles",
    "Polo",
    "Gatsby",
    "Hannah",
    "Nino",
    "Skippy",
    "Mac",
    "Biggie",
    "Mila",
    "Mika",
    "Kane",
    "Maxine",
    "Percy",
    "Taco",
    "Yoda",
    "Amy",
    "Rose",
    "Moxie",
    "Quincy",
    "Rico",
    "Pearl",
    "Blackie",
    "Kelly",
    "Nova",
    "Tito",
    "Freddie",
    "Frida",
    "Leila",
    "Bam",
    "Nicky",
    "Cupcake",
    "Rio",
    "Bianca",
    "Marty",
    "Ivy",
    "Blaze",
    "Pixie",
    "Mister",
    "Ernie",
    "Mack",
    "Hope",
    "Barkley",
    "Lilo",
    "Tinkerbell",
    "Kiwi",
    "Melo",
    "Odin",
    "Tallulah",
    "Mandy",
    "Toto",
    "Sofie",
    "Tank",
    "Puppy",
    "Pablo",
    "Odie",
    "Macho",
    "Dash",
    "Caesar",
    "Pinky",
    "Alice",
    "Basil",
    "Maxx",
    "Georgie",
    "Whiskey",
    "Shaggy",
    "Jazz",
    "Eva",
    "Pete",
    "Buttons",
    "Emily",
    "Stitch",
    "Rascal",
    "Domino",
    "Jacob",
    "Wilson",
    "Spot",
    "Maxie",
    "Nikko",
    "Quinn",
    "Jeter",
    "Red",
    "Atticus",
    "Billie",
    "Terry",
    "Kirby",
    "Susie",
    "DJ",
    "Savannah",
    "Faith",
    "Jordan",
    "Shiloh",
    "Tigger",
    "London",
    "Fritz",
    "Felix",
    "Iggy",
    "Ringo",
    "Butter",
    "Kuma",
    "Clementine",
    "Rocko",
    "Miley",
    "Sammie",
    "Brandi",
    "Dottie",
    "Zorro",
    "Zeke",
    "Choco",
    "Maisie",
    "Sunshine",
    "Lala",
    "Leia",
    "Jazzy",
    "Gemma",
    "Ripley",
    "Lincoln",
    "Mylo",
    "Dora",
    "Sherlock",
    "Coconut",
    "Jay",
    "Stevie",
    "Einstein",
    "Morgan",
    "Marco",
    "Titan",
    "Comet",
    "Kira",
    "Butch",
    "Nola",
    "Yuki",
    "Roger",
    "Laila",
    "Jenny",
    "Valentino",
    "Charles",
    "Mango",
    "Stewie",
    "Tobi",
    "Ariel",
    "Captain",
    "Freddy",
    "Lana",
    "Gypsy",
    "Rosco",
    "Buffy",
    "Isis",
    "Arthur",
    "Maisy",
    "Griffin",
    "Dutchess",
    "Kali",
    "Dobby",
    "Axel",
    "Jet",
    "Bodhi",
    "Kaya",
    "Betsy",
    "Mr",
    "Emmy",
    "Leonardo",
    "Pippin",
    "Munchkin",
    "Cotton",
    "Jada",
    "Willy",
    "Monkey",
    "Queenie",
    "June",
    "Reilly",
    "Astro",
    "Nacho",
    "Homer",
    "Ralph",
    "Luigi",
    "Elsa",
    "Levi",
    "Darla",
    "Finnegan",
    "Waffles",
    "Cleopatra",
    "Pluto",
    "Apple",
    "Tasha",
    "Mollie",
    "Skylar",
    "Maple",
    "Pip",
    "Seamus",
    "Woody",
    "Eloise",
    "Vinny",
    "Lula",
    "Daphne",
    "Blacky",
    "Dutch",
    "Nugget",
    "Banjo",
    "Kayla",
    "Kai",
    "Chi",
    "Joy",
    "Tessa",
    "Trouble",
    "Wallace",
    "Frances",
    "Copper",
    "Tara",
    "Poochie",
    "Wrigley",
    "CJ",
    "Gino",
    "Flash",
    "Magic",
    "Thomas",
]


def get_random_breed() -> str:
    """Get a random dog breed from the list."""
    return random.choice(DOG_BREEDS)


def get_random_pet_name() -> str:
    """Return a common pet name for more realistic data."""
    return random.choice(PET_NAMES)


def generate_phone_number() -> str:
    """Return a simple 10-digit phone number without formatting."""
    return fake.numerify("##########")


def create_pet(db: Session, customer_id: int, business_id: int) -> Pet:
    """Create a single pet with random data."""
    pet = Pet(
        customer_id=customer_id,
        business_id=business_id,
        name=get_random_pet_name(),
        species="Dog",
        breed=get_random_breed(),
        age=random.randint(1, 15),
        weight=round(random.uniform(5.0, 100.0), 1),
        special_notes=fake.sentence() if random.random() > 0.7 else None,
        notes=[],
    )
    db.add(pet)
    return pet


def create_customer_user(
    db: Session, customer_id: int, business_id: int, is_primary: bool = False
) -> CustomerUser:
    """Create a single customer user with random data."""
    first_name = fake.first_name()
    last_name = fake.last_name()

    customer_user = CustomerUser(
        customer_id=customer_id,
        business_id=business_id,
        email=fake.unique.email(),
        first_name=first_name,
        last_name=last_name,
        phone=generate_phone_number(),
        is_primary_contact=is_primary,
        notes=[],
    )
    db.add(customer_user)
    return customer_user


def create_customer_with_users_and_pets(
    db: Session, business_id: int
) -> tuple[Customer, list[CustomerUser], list[Pet]]:
    """Create a customer with 1-3 users and 1-3 pets."""
    # Create customer (household)
    last_name = fake.last_name()
    customer = Customer(
        business_id=business_id,
        account_name=f"{last_name} Family",
        status="active",
        address_line1=fake.street_address(),
        address_line2=fake.secondary_address() if random.random() > 0.7 else None,
        city=fake.city(),
        state=fake.state_abbr(),
        country="USA",
        postal_code=fake.zipcode(),
        notes=[],
    )
    db.add(customer)
    db.flush()  # Get the customer ID

    # Create 1-3 customer users
    num_users = random.randint(1, 3)
    users = []
    for i in range(num_users):
        user = create_customer_user(
            db, customer.id, business_id, is_primary=(i == 0)
        )
        users.append(user)

    # Create 1-3 pets with different breeds
    num_pets = random.randint(1, 3)
    pets = []
    used_breeds = set()
    for _ in range(num_pets):
        pet = create_pet(db, customer.id, business_id)
        # Try to get different breeds for variety
        attempts = 0
        while pet.breed in used_breeds and attempts < 5:
            pet.breed = get_random_breed()
            attempts += 1
        used_breeds.add(pet.breed)
        pets.append(pet)

    return customer, users, pets


@click.command()
@click.option(
    "--business-id",
    type=int,
    default=None,
    help="Business ID to create customers for. Can also be set via SEED_BUSINESS_ID env var.",
)
@click.option(
    "--num-customers",
    type=int,
    default=10,
    help="Number of customers to create (default: 10).",
)
def seed_customers(business_id: int | None, num_customers: int):
    """Seed the database with dummy customers, users, and pets."""
    # Get business ID from parameter or environment variable
    if business_id is None:
        business_id = os.environ.get("SEED_BUSINESS_ID")
        if business_id:
            business_id = int(business_id)

    if not business_id:
        click.echo("Error: Business ID is required. Use --business-id or set SEED_BUSINESS_ID env var.")
        sys.exit(1)

    db = SessionLocal()
    try:
        # Verify business exists
        business = db.query(Business).filter(Business.id == business_id).first()
        if not business:
            click.echo(f"Error: Business with ID {business_id} not found.")
            sys.exit(1)

        click.echo(f"Seeding data for business: {business.name} (ID: {business_id})")
        click.echo(f"Creating {num_customers} customers...")

        total_users = 0
        total_pets = 0

        for i in range(num_customers):
            customer, users, pets = create_customer_with_users_and_pets(db, business_id)
            total_users += len(users)
            total_pets += len(pets)

            if (i + 1) % 10 == 0:
                click.echo(f"  Created {i + 1} customers...")

        db.commit()

        click.echo("\nSeeding complete!")
        click.echo(f"  Customers created: {num_customers}")
        click.echo(f"  Customer users created: {total_users}")
        click.echo(f"  Pets created: {total_pets}")

    except Exception as e:
        db.rollback()
        click.echo(f"Error during seeding: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_customers()
