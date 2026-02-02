#!/usr/bin/env python3

"""
QuizHub Comprehensive Data Seeding Script
Creates realistic quiz data with diverse question types, categories, and user submissions
Includes: Single, Multiple, TrueFalse, and FillIn question types
"""

import requests
import json
import time
import random
from typing import List, Dict, Tuple

# Configuration
GATEWAY_URL = "http://quizhub.172.189.52.147.nip.io"
ADMIN_EMAIL = "admin@quizhub.com"
ADMIN_PASSWORD = "Admin123Pass!"

# Question Types
SINGLE = 0      # Single choice (one correct answer)
MULTIPLE = 1    # Multiple choice (can select multiple correct answers)
TRUE_FALSE = 2  # True/False question
FILL_IN = 3     # Fill in the blank

# Comprehensive Quiz Templates with Real, Meaningful Data
QUIZ_TEMPLATES = [
    {
        "title": "World War II History",
        "description": "Test your knowledge of the most significant conflict of the 20th century",
        "category": "History",
        "difficulty": 2,
        "timeLimitSeconds": 900,  # 15 minutes
        "questions": [
            {
                "text": "When did World War II begin in Europe?",
                "type": SINGLE,
                "answers": [
                    {"text": "September 1, 1939", "isCorrect": True},
                    {"text": "December 7, 1941", "isCorrect": False},
                    {"text": "June 22, 1941", "isCorrect": False},
                    {"text": "May 10, 1940", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which countries were part of the Axis Powers? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Germany", "isCorrect": True},
                    {"text": "Italy", "isCorrect": True},
                    {"text": "Japan", "isCorrect": True},
                    {"text": "Soviet Union", "isCorrect": False},
                    {"text": "France", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "The D-Day invasion took place on the beaches of Normandy, France.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "What was the code name for the Allied invasion of Normandy?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Operation Overlord", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "Which battle is considered the turning point on the Eastern Front?",
                "type": SINGLE,
                "answers": [
                    {"text": "Battle of Stalingrad", "isCorrect": True},
                    {"text": "Battle of Kursk", "isCorrect": False},
                    {"text": "Battle of Moscow", "isCorrect": False},
                    {"text": "Battle of Berlin", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "The atomic bombs were dropped on Hiroshima and Nagasaki in August 1945.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these were major Allied leaders during WWII? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Winston Churchill", "isCorrect": True},
                    {"text": "Franklin D. Roosevelt", "isCorrect": True},
                    {"text": "Joseph Stalin", "isCorrect": True},
                    {"text": "Adolf Hitler", "isCorrect": False},
                    {"text": "Benito Mussolini", "isCorrect": False}
                ],
                "points": 3
            }
        ]
    },
    {
        "title": "Advanced Python Programming",
        "description": "Deep dive into Python's advanced features and best practices",
        "category": "Technology",
        "difficulty": 3,
        "timeLimitSeconds": 1200,  # 20 minutes
        "questions": [
            {
                "text": "What is a decorator in Python?",
                "type": SINGLE,
                "answers": [
                    {"text": "A function that modifies another function", "isCorrect": True},
                    {"text": "A way to format strings", "isCorrect": False},
                    {"text": "A type of loop", "isCorrect": False},
                    {"text": "A data structure", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "Which of these are mutable data types in Python? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "List", "isCorrect": True},
                    {"text": "Dictionary", "isCorrect": True},
                    {"text": "Set", "isCorrect": True},
                    {"text": "Tuple", "isCorrect": False},
                    {"text": "String", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "Python uses duck typing for its type system.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "What is the Python keyword used to create an anonymous function?",
                "type": FILL_IN,
                "answers": [
                    {"text": "lambda", "isCorrect": True}
                ],
                "points": 1,
                "isCaseSensitive": False
            },
            {
                "text": "What is the time complexity of dictionary lookup in Python?",
                "type": SINGLE,
                "answers": [
                    {"text": "O(1) average case", "isCorrect": True},
                    {"text": "O(log n)", "isCorrect": False},
                    {"text": "O(n)", "isCorrect": False},
                    {"text": "O(n²)", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "List comprehensions are always faster than equivalent for loops in Python.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": False},
                    {"text": "False", "isCorrect": True}
                ],
                "points": 2
            },
            {
                "text": "Which of these are valid ways to create a virtual environment? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "python -m venv env", "isCorrect": True},
                    {"text": "virtualenv env", "isCorrect": True},
                    {"text": "conda create --name env", "isCorrect": True},
                    {"text": "pip install virtualenv", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "What does GIL stand for in Python?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Global Interpreter Lock", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            }
        ]
    },
    {
        "title": "Human Anatomy and Physiology",
        "description": "Comprehensive quiz on the human body systems and functions",
        "category": "Science",
        "difficulty": 2,
        "timeLimitSeconds": 720,  # 12 minutes
        "questions": [
            {
                "text": "How many chambers does the human heart have?",
                "type": SINGLE,
                "answers": [
                    {"text": "Four", "isCorrect": True},
                    {"text": "Two", "isCorrect": False},
                    {"text": "Three", "isCorrect": False},
                    {"text": "Five", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "The human brain is divided into left and right hemispheres.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which organs are part of the digestive system? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Stomach", "isCorrect": True},
                    {"text": "Small intestine", "isCorrect": True},
                    {"text": "Liver", "isCorrect": True},
                    {"text": "Pancreas", "isCorrect": True},
                    {"text": "Lungs", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What is the largest organ in the human body?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Skin", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "Red blood cells carry oxygen throughout the body.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "How many bones are in the adult human body?",
                "type": SINGLE,
                "answers": [
                    {"text": "206", "isCorrect": True},
                    {"text": "208", "isCorrect": False},
                    {"text": "200", "isCorrect": False},
                    {"text": "212", "isCorrect": False}
                ],
                "points": 1
            }
        ]
    },
    {
        "title": "Shakespeare and Renaissance Literature",
        "description": "Explore the works of William Shakespeare and his contemporaries",
        "category": "Literature",
        "difficulty": 3,
        "timeLimitSeconds": 900,  # 15 minutes
        "questions": [
            {
                "text": "In which year was William Shakespeare born?",
                "type": SINGLE,
                "answers": [
                    {"text": "1564", "isCorrect": True},
                    {"text": "1560", "isCorrect": False},
                    {"text": "1570", "isCorrect": False},
                    {"text": "1550", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are Shakespeare tragedies? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Hamlet", "isCorrect": True},
                    {"text": "Macbeth", "isCorrect": True},
                    {"text": "Othello", "isCorrect": True},
                    {"text": "The Tempest", "isCorrect": False},
                    {"text": "Much Ado About Nothing", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "Romeo and Juliet is set in the Italian city of Verona.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Complete the famous line from Hamlet: 'To be, or not to be, that is the ______'",
                "type": FILL_IN,
                "answers": [
                    {"text": "question", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "Which play features the characters Puck and Oberon?",
                "type": SINGLE,
                "answers": [
                    {"text": "A Midsummer Night's Dream", "isCorrect": True},
                    {"text": "The Tempest", "isCorrect": False},
                    {"text": "As You Like It", "isCorrect": False},
                    {"text": "Twelfth Night", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "Shakespeare wrote exactly 38 plays.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "What is the name of Shakespeare's theater?",
                "type": FILL_IN,
                "answers": [
                    {"text": "The Globe", "isCorrect": True},
                    {"text": "Globe Theatre", "isCorrect": True},
                    {"text": "Globe", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            }
        ]
    },
    {
        "title": "Climate Change and Environmental Science",
        "description": "Understanding the science behind climate change and environmental issues",
        "category": "Science",
        "difficulty": 2,
        "timeLimitSeconds": 600,  # 10 minutes
        "questions": [
            {
                "text": "What is the primary greenhouse gas contributing to climate change?",
                "type": SINGLE,
                "answers": [
                    {"text": "Carbon dioxide (CO2)", "isCorrect": True},
                    {"text": "Oxygen (O2)", "isCorrect": False},
                    {"text": "Nitrogen (N2)", "isCorrect": False},
                    {"text": "Hydrogen (H2)", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "The greenhouse effect is entirely harmful and should be eliminated.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": False},
                    {"text": "False", "isCorrect": True}
                ],
                "points": 2
            },
            {
                "text": "Which of these are renewable energy sources? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Solar", "isCorrect": True},
                    {"text": "Wind", "isCorrect": True},
                    {"text": "Hydroelectric", "isCorrect": True},
                    {"text": "Coal", "isCorrect": False},
                    {"text": "Natural gas", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What is the process by which trees absorb CO2 and release oxygen called?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Photosynthesis", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "The Paris Agreement aims to limit global warming to well below 2°C above pre-industrial levels.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            }
        ]
    },
    {
        "title": "Modern Web Development Stack",
        "description": "Full-stack development with React, Node.js, and databases",
        "category": "Technology",
        "difficulty": 3,
        "timeLimitSeconds": 1080,  # 18 minutes
        "questions": [
            {
                "text": "What is React primarily used for?",
                "type": SINGLE,
                "answers": [
                    {"text": "Building user interfaces", "isCorrect": True},
                    {"text": "Managing databases", "isCorrect": False},
                    {"text": "Server-side routing", "isCorrect": False},
                    {"text": "Styling web pages", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are valid HTTP methods? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "GET", "isCorrect": True},
                    {"text": "POST", "isCorrect": True},
                    {"text": "PUT", "isCorrect": True},
                    {"text": "DELETE", "isCorrect": True},
                    {"text": "FETCH", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "REST stands for Representational State Transfer.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "What is the Node.js package manager called?",
                "type": FILL_IN,
                "answers": [
                    {"text": "npm", "isCorrect": True}
                ],
                "points": 1,
                "isCaseSensitive": False
            },
            {
                "text": "In React, props are immutable and cannot be changed by the component receiving them.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "Which database types are NoSQL? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "MongoDB", "isCorrect": True},
                    {"text": "Redis", "isCorrect": True},
                    {"text": "Cassandra", "isCorrect": True},
                    {"text": "PostgreSQL", "isCorrect": False},
                    {"text": "MySQL", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What does CORS stand for?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Cross-Origin Resource Sharing", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            }
        ]
    },
    {
        "title": "Financial Literacy Basics",
        "description": "Essential concepts in personal finance and investing",
        "category": "Finance",
        "difficulty": 1,
        "timeLimitSeconds": 480,  # 8 minutes
        "questions": [
            {
                "text": "What does APR stand for?",
                "type": SINGLE,
                "answers": [
                    {"text": "Annual Percentage Rate", "isCorrect": True},
                    {"text": "Annual Payment Rate", "isCorrect": False},
                    {"text": "Average Price Rate", "isCorrect": False},
                    {"text": "Annual Premium Rate", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Compound interest means earning interest on both your principal and previously earned interest.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are types of investment accounts? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "401(k)", "isCorrect": True},
                    {"text": "IRA", "isCorrect": True},
                    {"text": "Roth IRA", "isCorrect": True},
                    {"text": "Credit card", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "What is the recommended percentage of income to save for emergencies?",
                "type": FILL_IN,
                "answers": [
                    {"text": "20", "isCorrect": True},
                    {"text": "20%", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "A good credit score is generally considered to be above 700.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            }
        ]
    },
    {
        "title": "Classical Music Composers",
        "description": "Famous composers and their masterpieces from the Classical and Romantic periods",
        "category": "Music",
        "difficulty": 2,
        "timeLimitSeconds": 540,  # 9 minutes
        "questions": [
            {
                "text": "Who composed the 'Moonlight Sonata'?",
                "type": SINGLE,
                "answers": [
                    {"text": "Ludwig van Beethoven", "isCorrect": True},
                    {"text": "Wolfgang Amadeus Mozart", "isCorrect": False},
                    {"text": "Johann Sebastian Bach", "isCorrect": False},
                    {"text": "Frédéric Chopin", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Mozart was a child prodigy who composed his first piece at age 5.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these composers are from the Romantic period? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Chopin", "isCorrect": True},
                    {"text": "Liszt", "isCorrect": True},
                    {"text": "Tchaikovsky", "isCorrect": True},
                    {"text": "Bach", "isCorrect": False},
                    {"text": "Handel", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What instrument is Chopin most famous for composing?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Piano", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "Beethoven composed his famous 9th Symphony after he had become completely deaf.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 2
            }
        ]
    },
    {
        "title": "Ancient Greek Philosophy",
        "description": "Major philosophers and their contributions to Western thought",
        "category": "Philosophy",
        "difficulty": 3,
        "timeLimitSeconds": 720,  # 12 minutes
        "questions": [
            {
                "text": "Who was Socrates' most famous student?",
                "type": SINGLE,
                "answers": [
                    {"text": "Plato", "isCorrect": True},
                    {"text": "Aristotle", "isCorrect": False},
                    {"text": "Pythagoras", "isCorrect": False},
                    {"text": "Heraclitus", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Plato founded the Academy in Athens.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are Platonic virtues? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Wisdom", "isCorrect": True},
                    {"text": "Courage", "isCorrect": True},
                    {"text": "Temperance", "isCorrect": True},
                    {"text": "Justice", "isCorrect": True},
                    {"text": "Faith", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What is the title of Plato's most famous work about an ideal state?",
                "type": FILL_IN,
                "answers": [
                    {"text": "The Republic", "isCorrect": True},
                    {"text": "Republic", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "Aristotle tutored Alexander the Great.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "What method of inquiry did Socrates use, involving asking questions to stimulate critical thinking?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Socratic Method", "isCorrect": True},
                    {"text": "The Socratic Method", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            }
        ]
    },
    {
        "title": "Space Exploration Milestones",
        "description": "Historic achievements in humanity's journey to the stars",
        "category": "Science",
        "difficulty": 2,
        "timeLimitSeconds": 660,  # 11 minutes
        "questions": [
            {
                "text": "Who was the first human in space?",
                "type": SINGLE,
                "answers": [
                    {"text": "Yuri Gagarin", "isCorrect": True},
                    {"text": "Neil Armstrong", "isCorrect": False},
                    {"text": "Alan Shepard", "isCorrect": False},
                    {"text": "John Glenn", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "The Apollo 11 mission successfully landed humans on the Moon in 1969.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these space telescopes have been launched? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Hubble", "isCorrect": True},
                    {"text": "James Webb", "isCorrect": True},
                    {"text": "Kepler", "isCorrect": True},
                    {"text": "Galileo", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What year did humans first land on the Moon?",
                "type": FILL_IN,
                "answers": [
                    {"text": "1969", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "The International Space Station orbits Earth.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which planet have multiple rovers explored?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Mars", "isCorrect": True}
                ],
                "points": 1,
                "isCaseSensitive": False
            }
        ]
    }
]

# Diverse user profiles
USERS = [
    {"username": "alex_tech", "email": "alex.tech@example.com", "firstName": "Alex", "lastName": "Technology"},
    {"username": "maria_science", "email": "maria.sci@example.com", "firstName": "Maria", "lastName": "Science"},
    {"username": "john_history", "email": "john.hist@example.com", "firstName": "John", "lastName": "History"},
    {"username": "sarah_arts", "email": "sarah.arts@example.com", "firstName": "Sarah", "lastName": "Arts"},
    {"username": "david_math", "email": "david.math@example.com", "firstName": "David", "lastName": "Mathematics"},
    {"username": "emma_lit", "email": "emma.lit@example.com", "firstName": "Emma", "lastName": "Literature"},
    {"username": "james_sports", "email": "james.sports@example.com", "firstName": "James", "lastName": "Sports"},
    {"username": "lisa_music", "email": "lisa.music@example.com", "firstName": "Lisa", "lastName": "Music"},
    {"username": "robert_geo", "email": "robert.geo@example.com", "firstName": "Robert", "lastName": "Geography"},
    {"username": "jennifer_bio", "email": "jennifer.bio@example.com", "firstName": "Jennifer", "lastName": "Biology"},
    {"username": "michael_cs", "email": "michael.cs@example.com", "firstName": "Michael", "lastName": "ComputerSci"},
    {"username": "emily_chem", "email": "emily.chem@example.com", "firstName": "Emily", "lastName": "Chemistry"},
    {"username": "william_phys", "email": "william.phys@example.com", "firstName": "William", "lastName": "Physics"},
    {"username": "sophia_lang", "email": "sophia.lang@example.com", "firstName": "Sophia", "lastName": "Languages"},
    {"username": "oliver_eng", "email": "oliver.eng@example.com", "firstName": "Oliver", "lastName": "Engineering"},
]

def log(message, level="INFO"):
    """Simple logging with colors"""
    colors = {
        "INFO": "\033[0;36m",
        "SUCCESS": "\033[0;32m",
        "ERROR": "\033[0;31m",
        "WARNING": "\033[1;33m",
    }
    color = colors.get(level, "")
    reset = "\033[0m"
    print(f"{color}[{level}]{reset} {message}")

def login_admin() -> str:
    """Login as admin and return token"""
    payload = {
        "usernameOrEmail": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/users/login",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            log(f"✓ Logged in as admin", "SUCCESS")
            return token
        else:
            log(f"Admin login failed: {response.status_code}", "ERROR")
            return ""
    except Exception as e:
        log(f"Admin login error: {str(e)}", "ERROR")
        return ""

def register_user(username: str, email: str, firstName: str, lastName: str, password: str = "User123Pass!") -> Tuple[bool, Dict]:
    """Register a new user"""
    payload = {
        "username": (None, username),
        "email": (None, email),
        "password": (None, password),
        "firstName": (None, firstName),
        "lastName": (None, lastName)
    }
    
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/users/register",
            files=payload,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            return True, {"token": data.get("token"), "user": data.get("user")}
        elif response.status_code == 409:
            return False, {}
        else:
            log(f"User registration failed: {response.status_code}", "ERROR")
            return False, {}
    except Exception as e:
        log(f"User registration error: {str(e)}", "ERROR")
        return False, {}

def create_quiz(token: str, template: Dict) -> str:
    """Create a quiz from template with proper question types"""
    questions = []
    for q in template["questions"]:
        question_data = {
            "text": q["text"],
            "questionType": q["type"],
            "points": q.get("points", 1),
            "isCaseSensitive": q.get("isCaseSensitive", False),
            "answers": q["answers"]
        }
        questions.append(question_data)
    
    quiz_data = {
        "title": template["title"],
        "description": template["description"],
        "category": template["category"],
        "difficulty": template["difficulty"],
        "timeLimitSeconds": template["timeLimitSeconds"],
        "questions": questions
    }
    
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/quizzes",
            json=quiz_data,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            quiz_id = data.get("id") or data.get("Id")
            return quiz_id
        else:
            log(f"Quiz creation failed: {response.status_code} - {response.text[:200]}", "ERROR")
            return ""
    except Exception as e:
        log(f"Quiz creation error: {str(e)}", "ERROR")
        return ""

def main():
    print("=" * 70)
    print("         QuizHub Comprehensive Data Seeding Script")
    print("=" * 70)
    print()
    
    # Step 1: Admin login
    log("Step 1: Logging in as admin...")
    admin_token = login_admin()
    if not admin_token:
        log("Failed to login as admin. Exiting.", "ERROR")
        return
    
    # Step 2: Create quizzes
    log(f"\nStep 2: Creating {len(QUIZ_TEMPLATES)} comprehensive quizzes with diverse question types...")
    created_quiz_ids = []
    
    for i, template in enumerate(QUIZ_TEMPLATES, 1):
        quiz_id = create_quiz(admin_token, template)
        if quiz_id:
            created_quiz_ids.append(quiz_id)
            log(f"  [{i}/{len(QUIZ_TEMPLATES)}] ✓ Created: {template['title']}", "SUCCESS")
        else:
            log(f"  [{i}/{len(QUIZ_TEMPLATES)}] ✗ Failed: {template['title']}", "ERROR")
        time.sleep(0.5)
    
    log(f"\n✓ Successfully created {len(created_quiz_ids)} quizzes", "SUCCESS")
    
    # Step 3: Register users
    log(f"\nStep 3: Creating {len(USERS)} diverse users...")
    registered_users = []
    
    for user in USERS:
        success, data = register_user(
            user["username"],
            user["email"],
            user["firstName"],
            user["lastName"]
        )
        
        if success:
            registered_users.append(data)
            log(f"  ✓ Registered: {user['username']}", "SUCCESS")
        else:
            log(f"  ⚠ Skipped (may exist): {user['username']}", "WARNING")
        time.sleep(0.3)
    
    log(f"\n✓ Have {len(registered_users)} users ready", "SUCCESS")
    
    # Summary
    print()
    print("=" * 70)
    print("              Data Seeding Complete!")
    print("=" * 70)
    print()
    print(f"📊 Summary:")
    print(f"   • Quizzes created: {len(created_quiz_ids)}")
    print(f"   • Users registered: {len(registered_users)}")
    print(f"   • Question types used: Single, Multiple, True/False, Fill-in")
    print()
    print(f"🌐 Access your seeded data at: {GATEWAY_URL}")

if __name__ == "__main__":
    main()
