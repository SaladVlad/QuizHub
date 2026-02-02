#!/usr/bin/env python3

"""
QuizHub Cleanup and Complete Data Seeding Script
Removes incomplete quizzes and replaces with realistic, diverse data
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

# Realistic and Complete Quiz Templates
QUIZ_TEMPLATES = [
    {
        "title": "European History: The Renaissance",
        "description": "Explore the rebirth of art, science, and culture in 14th-17th century Europe",
        "category": "History",
        "difficulty": 2,
        "timeLimitSeconds": 720,  # 12 minutes
        "questions": [
            {
                "text": "In which Italian city did the Renaissance begin?",
                "type": SINGLE,
                "answers": [
                    {"text": "Florence", "isCorrect": True},
                    {"text": "Rome", "isCorrect": False},
                    {"text": "Venice", "isCorrect": False},
                    {"text": "Milan", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are famous Renaissance artists? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Leonardo da Vinci", "isCorrect": True},
                    {"text": "Michelangelo", "isCorrect": True},
                    {"text": "Raphael", "isCorrect": True},
                    {"text": "Pablo Picasso", "isCorrect": False},
                    {"text": "Vincent van Gogh", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "The printing press was invented by Johannes Gutenberg around 1440.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Who painted the ceiling of the Sistine Chapel?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Michelangelo", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "The Medici family were powerful patrons of the arts during the Renaissance.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which scientist challenged the geocentric model of the universe?",
                "type": SINGLE,
                "answers": [
                    {"text": "Galileo Galilei", "isCorrect": True},
                    {"text": "Isaac Newton", "isCorrect": False},
                    {"text": "Albert Einstein", "isCorrect": False},
                    {"text": "Charles Darwin", "isCorrect": False}
                ],
                "points": 2
            }
        ]
    },
    {
        "title": "Full-Stack JavaScript Development",
        "description": "Modern JavaScript ecosystem: Node.js, React, Express, and databases",
        "category": "Technology",
        "difficulty": 3,
        "timeLimitSeconds": 900,  # 15 minutes
        "questions": [
            {
                "text": "What is Node.js primarily used for?",
                "type": SINGLE,
                "answers": [
                    {"text": "Server-side JavaScript execution", "isCorrect": True},
                    {"text": "CSS preprocessing", "isCorrect": False},
                    {"text": "Image editing", "isCorrect": False},
                    {"text": "Database management", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Node.js runs on the V8 JavaScript engine developed by Google.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are popular Node.js frameworks? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Express.js", "isCorrect": True},
                    {"text": "NestJS", "isCorrect": True},
                    {"text": "Fastify", "isCorrect": True},
                    {"text": "Django", "isCorrect": False},
                    {"text": "Laravel", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What does npm stand for?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Node Package Manager", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "In React, which hook is used to manage component state?",
                "type": SINGLE,
                "answers": [
                    {"text": "useState", "isCorrect": True},
                    {"text": "useContext", "isCorrect": False},
                    {"text": "useEffect", "isCorrect": False},
                    {"text": "useReducer", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "Express.js is a minimal and flexible Node.js web application framework.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are valid JavaScript data types? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "String", "isCorrect": True},
                    {"text": "Number", "isCorrect": True},
                    {"text": "Boolean", "isCorrect": True},
                    {"text": "Integer", "isCorrect": False},
                    {"text": "Float", "isCorrect": False}
                ],
                "points": 2
            }
        ]
    },
    {
        "title": "Human Biology and Health",
        "description": "Understanding the human body: organs, systems, and wellness",
        "category": "Science",
        "difficulty": 2,
        "timeLimitSeconds": 600,  # 10 minutes
        "questions": [
            {
                "text": "What is the largest organ in the human body?",
                "type": SINGLE,
                "answers": [
                    {"text": "Skin", "isCorrect": True},
                    {"text": "Liver", "isCorrect": False},
                    {"text": "Brain", "isCorrect": False},
                    {"text": "Heart", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "The human heart has four chambers.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which blood type is known as the universal donor?",
                "type": FILL_IN,
                "answers": [
                    {"text": "O negative", "isCorrect": True},
                    {"text": "O-", "isCorrect": True},
                    {"text": "Type O negative", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "Which of these are parts of the digestive system? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Stomach", "isCorrect": True},
                    {"text": "Small intestine", "isCorrect": True},
                    {"text": "Liver", "isCorrect": True},
                    {"text": "Lungs", "isCorrect": False},
                    {"text": "Kidneys", "isCorrect": False}
                ],
                "points": 3
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
                "text": "How many bones does an adult human have?",
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
        "title": "World Geography: Countries and Capitals",
        "description": "Test your knowledge of countries, capitals, and geographical features",
        "category": "Geography",
        "difficulty": 2,
        "timeLimitSeconds": 480,  # 8 minutes
        "questions": [
            {
                "text": "What is the capital of Australia?",
                "type": SINGLE,
                "answers": [
                    {"text": "Canberra", "isCorrect": True},
                    {"text": "Sydney", "isCorrect": False},
                    {"text": "Melbourne", "isCorrect": False},
                    {"text": "Brisbane", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "The Amazon Rainforest is located primarily in Brazil.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these countries are in South America? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Argentina", "isCorrect": True},
                    {"text": "Chile", "isCorrect": True},
                    {"text": "Peru", "isCorrect": True},
                    {"text": "Mexico", "isCorrect": False},
                    {"text": "Spain", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What is the longest river in the world?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Nile", "isCorrect": True},
                    {"text": "The Nile", "isCorrect": True},
                    {"text": "Nile River", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "Mount Everest is located in the Himalayan mountain range.",
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
        "title": "Mathematics: Algebra and Geometry",
        "description": "Fundamental concepts in algebra, equations, and geometric principles",
        "category": "Mathematics",
        "difficulty": 2,
        "timeLimitSeconds": 540,  # 9 minutes
        "questions": [
            {
                "text": "What is the value of x if 2x + 5 = 15?",
                "type": SINGLE,
                "answers": [
                    {"text": "5", "isCorrect": True},
                    {"text": "10", "isCorrect": False},
                    {"text": "7", "isCorrect": False},
                    {"text": "3", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "A triangle with all sides equal is called an equilateral triangle.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "What is the area of a rectangle with length 8 and width 5?",
                "type": FILL_IN,
                "answers": [
                    {"text": "40", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "Which of these are properties of a square? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "All sides are equal", "isCorrect": True},
                    {"text": "All angles are 90 degrees", "isCorrect": True},
                    {"text": "Opposite sides are parallel", "isCorrect": True},
                    {"text": "Has three sides", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What is the square root of 144?",
                "type": SINGLE,
                "answers": [
                    {"text": "12", "isCorrect": True},
                    {"text": "14", "isCorrect": False},
                    {"text": "10", "isCorrect": False},
                    {"text": "16", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "The sum of angles in a triangle always equals 180 degrees.",
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
        "title": "Cinema and Film History",
        "description": "Classic films, directors, and the evolution of cinema",
        "category": "Arts",
        "difficulty": 2,
        "timeLimitSeconds": 600,  # 10 minutes
        "questions": [
            {
                "text": "Who directed 'The Godfather' (1972)?",
                "type": SINGLE,
                "answers": [
                    {"text": "Francis Ford Coppola", "isCorrect": True},
                    {"text": "Martin Scorsese", "isCorrect": False},
                    {"text": "Steven Spielberg", "isCorrect": False},
                    {"text": "Alfred Hitchcock", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "The first 'Star Wars' film was released in 1977.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these films won the Best Picture Oscar? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Titanic", "isCorrect": True},
                    {"text": "The Lord of the Rings: The Return of the King", "isCorrect": True},
                    {"text": "Parasite", "isCorrect": True},
                    {"text": "Avatar", "isCorrect": False},
                    {"text": "The Dark Knight", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "In which city does 'Casablanca' (1942) take place?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Casablanca", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "Christopher Nolan directed 'Inception' (2010).",
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
        "title": "Nutrition and Healthy Eating",
        "description": "Understanding macronutrients, vitamins, and balanced diets",
        "category": "Health",
        "difficulty": 1,
        "timeLimitSeconds": 420,  # 7 minutes
        "questions": [
            {
                "text": "Which vitamin is primarily obtained from sunlight?",
                "type": SINGLE,
                "answers": [
                    {"text": "Vitamin D", "isCorrect": True},
                    {"text": "Vitamin C", "isCorrect": False},
                    {"text": "Vitamin A", "isCorrect": False},
                    {"text": "Vitamin B12", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Proteins are essential for building and repairing body tissues.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are sources of complex carbohydrates? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Whole grains", "isCorrect": True},
                    {"text": "Brown rice", "isCorrect": True},
                    {"text": "Oats", "isCorrect": True},
                    {"text": "White sugar", "isCorrect": False},
                    {"text": "Candy", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "How many liters of water should an average adult drink daily?",
                "type": FILL_IN,
                "answers": [
                    {"text": "2", "isCorrect": True},
                    {"text": "2 liters", "isCorrect": True},
                    {"text": "two", "isCorrect": True}
                ],
                "points": 1,
                "isCaseSensitive": False
            },
            {
                "text": "Omega-3 fatty acids are beneficial for heart health.",
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
        "title": "English Grammar and Writing",
        "description": "Parts of speech, sentence structure, and writing mechanics",
        "category": "Language",
        "difficulty": 2,
        "timeLimitSeconds": 480,  # 8 minutes
        "questions": [
            {
                "text": "What part of speech describes a noun?",
                "type": SINGLE,
                "answers": [
                    {"text": "Adjective", "isCorrect": True},
                    {"text": "Adverb", "isCorrect": False},
                    {"text": "Verb", "isCorrect": False},
                    {"text": "Preposition", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "A sentence must have a subject and a predicate.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are types of sentences? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Declarative", "isCorrect": True},
                    {"text": "Interrogative", "isCorrect": True},
                    {"text": "Imperative", "isCorrect": True},
                    {"text": "Exclamatory", "isCorrect": True},
                    {"text": "Narrative", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What punctuation mark is used to join two independent clauses?",
                "type": FILL_IN,
                "answers": [
                    {"text": "semicolon", "isCorrect": True},
                    {"text": "semi-colon", "isCorrect": True},
                    {"text": ";", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "The word 'run' can function as both a noun and a verb.",
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
        "title": "Olympic Games and Sports History",
        "description": "Olympic history, records, and memorable sporting moments",
        "category": "Sports",
        "difficulty": 2,
        "timeLimitSeconds": 540,  # 9 minutes
        "questions": [
            {
                "text": "In which city were the first modern Olympic Games held in 1896?",
                "type": SINGLE,
                "answers": [
                    {"text": "Athens", "isCorrect": True},
                    {"text": "Paris", "isCorrect": False},
                    {"text": "London", "isCorrect": False},
                    {"text": "Rome", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Michael Phelps is the most decorated Olympian of all time.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are Olympic summer sports? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Swimming", "isCorrect": True},
                    {"text": "Track and Field", "isCorrect": True},
                    {"text": "Basketball", "isCorrect": True},
                    {"text": "Ice Hockey", "isCorrect": False},
                    {"text": "Skiing", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "How many rings are in the Olympic symbol?",
                "type": FILL_IN,
                "answers": [
                    {"text": "5", "isCorrect": True},
                    {"text": "five", "isCorrect": True}
                ],
                "points": 1,
                "isCaseSensitive": False
            },
            {
                "text": "Usain Bolt holds the world record for the 100m sprint.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which country has won the most Olympic gold medals in history?",
                "type": SINGLE,
                "answers": [
                    {"text": "United States", "isCorrect": True},
                    {"text": "China", "isCorrect": False},
                    {"text": "Russia", "isCorrect": False},
                    {"text": "Great Britain", "isCorrect": False}
                ],
                "points": 2
            }
        ]
    },
    {
        "title": "Climate Science Fundamentals",
        "description": "Understanding weather patterns, climate zones, and environmental science",
        "category": "Science",
        "difficulty": 2,
        "timeLimitSeconds": 600,  # 10 minutes
        "questions": [
            {
                "text": "What is the greenhouse effect?",
                "type": SINGLE,
                "answers": [
                    {"text": "Trapping of heat in Earth's atmosphere", "isCorrect": True},
                    {"text": "Growing plants in greenhouses", "isCorrect": False},
                    {"text": "The color of plants", "isCorrect": False},
                    {"text": "Solar energy production", "isCorrect": False}
                ],
                "points": 2
            },
            {
                "text": "Carbon dioxide is a greenhouse gas.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            },
            {
                "text": "Which of these are renewable energy sources? (Select all that apply)",
                "type": MULTIPLE,
                "answers": [
                    {"text": "Solar power", "isCorrect": True},
                    {"text": "Wind energy", "isCorrect": True},
                    {"text": "Hydroelectric power", "isCorrect": True},
                    {"text": "Coal", "isCorrect": False},
                    {"text": "Natural gas", "isCorrect": False}
                ],
                "points": 3
            },
            {
                "text": "What is the process by which plants absorb CO2 and release oxygen?",
                "type": FILL_IN,
                "answers": [
                    {"text": "Photosynthesis", "isCorrect": True}
                ],
                "points": 2,
                "isCaseSensitive": False
            },
            {
                "text": "The ozone layer protects Earth from harmful UV radiation.",
                "type": TRUE_FALSE,
                "answers": [
                    {"text": "True", "isCorrect": True},
                    {"text": "False", "isCorrect": False}
                ],
                "points": 1
            }
        ]
    }
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

def get_all_quizzes(token: str) -> List[Dict]:
    """Get all quizzes"""
    try:
        response = requests.get(
            f"{GATEWAY_URL}/api/quizzes?page=1&pageSize=100",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # Handle both paginated and non-paginated responses
            if isinstance(data, dict):
                return data.get("quizzes", data.get("items", []))
            elif isinstance(data, list):
                return data
        return []
    except Exception as e:
        log(f"Error fetching quizzes: {str(e)}", "ERROR")
        return []

def delete_quiz(token: str, quiz_id: str) -> bool:
    """Delete a quiz"""
    try:
        response = requests.delete(
            f"{GATEWAY_URL}/api/quizzes/{quiz_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        return response.status_code in [200, 204]
    except Exception as e:
        log(f"Error deleting quiz {quiz_id}: {str(e)}", "ERROR")
        return False

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
    print("      QuizHub Cleanup and Complete Data Seeding")
    print("=" * 70)
    print()
    
    # Step 1: Admin login
    log("Step 1: Logging in as admin...")
    admin_token = login_admin()
    if not admin_token:
        log("Failed to login as admin. Exiting.", "ERROR")
        return
    
    # Step 2: Get existing quizzes
    log("\nStep 2: Fetching existing quizzes...")
    existing_quizzes = get_all_quizzes(admin_token)
    log(f"Found {len(existing_quizzes)} existing quizzes")
    
    # Step 3: Delete incomplete quizzes (TimeLimitSeconds = 0)
    log("\nStep 3: Removing incomplete quizzes (TimeLimitSeconds = 0)...")
    deleted_count = 0
    for quiz in existing_quizzes:
        if quiz.get("timeLimitSeconds", 0) == 0:
            quiz_id = quiz.get("id")
            if delete_quiz(admin_token, quiz_id):
                deleted_count += 1
                log(f"  ✓ Deleted: {quiz.get('title', 'Unknown')}", "SUCCESS")
            else:
                log(f"  ✗ Failed to delete: {quiz.get('title', 'Unknown')}", "ERROR")
            time.sleep(0.3)
    
    log(f"\n✓ Deleted {deleted_count} incomplete quizzes", "SUCCESS")
    
    # Step 4: Create new complete quizzes
    log(f"\nStep 4: Creating {len(QUIZ_TEMPLATES)} complete and realistic quizzes...")
    created_quiz_ids = []
    
    for i, template in enumerate(QUIZ_TEMPLATES, 1):
        quiz_id = create_quiz(admin_token, template)
        if quiz_id:
            created_quiz_ids.append(quiz_id)
            log(f"  [{i}/{len(QUIZ_TEMPLATES)}] ✓ Created: {template['title']}", "SUCCESS")
        else:
            log(f"  [{i}/{len(QUIZ_TEMPLATES)}] ✗ Failed: {template['title']}", "ERROR")
        time.sleep(0.5)
    
    # Summary
    print()
    print("=" * 70)
    print("              Cleanup and Seeding Complete!")
    print("=" * 70)
    print()
    print(f"📊 Summary:")
    print(f"   • Deleted incomplete quizzes: {deleted_count}")
    print(f"   • Created new quizzes: {len(created_quiz_ids)}")
    print(f"   • Question types used: Single, Multiple, True/False, Fill-in")
    print(f"   • Categories covered: History, Technology, Science, Geography,")
    print(f"                         Mathematics, Arts, Health, Language, Sports")
    print()
    print(f"🌐 Access your data at: {GATEWAY_URL}")

if __name__ == "__main__":
    main()
