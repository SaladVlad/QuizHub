#!/usr/bin/env python3

"""
QuizHub Data Seeding Script
Creates realistic quiz data with diverse questions, categories, and user submissions
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

# Quiz templates with diverse questions
QUIZ_TEMPLATES = [
    {
        "title": "World History: Ancient Civilizations",
        "description": "Test your knowledge of ancient civilizations from around the world",
        "category": "History",
        "difficulty": 2,
        "timeLimitSeconds": 600,  # 10 minutes
        "questions": [
            {"text": "Which ancient civilization built the pyramids of Giza?", "answers": ["Egyptians", "Romans", "Greeks", "Persians"], "correct": 0},
            {"text": "What year did the Roman Empire fall?", "answers": ["476 AD", "500 AD", "400 AD", "550 AD"], "correct": 0},
            {"text": "Who was the first emperor of China?", "answers": ["Qin Shi Huang", "Liu Bang", "Emperor Wu", "Kublai Khan"], "correct": 0},
            {"text": "The Hanging Gardens were located in which ancient city?", "answers": ["Babylon", "Athens", "Rome", "Alexandria"], "correct": 0},
            {"text": "Which civilization invented paper?", "answers": ["Chinese", "Egyptian", "Mesopotamian", "Indian"], "correct": 0},
            {"text": "What was the primary writing system of ancient Mesopotamia?", "answers": ["Cuneiform", "Hieroglyphics", "Sanskrit", "Phoenician"], "correct": 0},
            {"text": "The Colosseum is located in which ancient city?", "answers": ["Rome", "Athens", "Constantinople", "Alexandria"], "correct": 0},
            {"text": "Who was the famous queen of ancient Egypt known for her relationship with Julius Caesar?", "answers": ["Cleopatra", "Nefertiti", "Hatshepsut", "Nefertari"], "correct": 0},
        ]
    },
    {
        "title": "Programming Fundamentals",
        "description": "Essential programming concepts every developer should know",
        "category": "Technology",
        "difficulty": 2,
        "timeLimitSeconds": 480,  # 8 minutes
        "questions": [
            {"text": "What is the time complexity of binary search?", "answers": ["O(log n)", "O(n)", "O(n²)", "O(1)"], "correct": 0},
            {"text": "Which data structure uses LIFO (Last In First Out)?", "answers": ["Stack", "Queue", "Array", "Tree"], "correct": 0},
            {"text": "What does OOP stand for?", "answers": ["Object Oriented Programming", "Open Operation Protocol", "Output Optimization Process", "Ordered Object Pattern"], "correct": 0},
            {"text": "Which keyword is used to define a function in Python?", "answers": ["def", "function", "func", "define"], "correct": 0},
            {"text": "What is a closure in JavaScript?", "answers": ["A function with access to outer scope", "A closed loop", "A terminated process", "An error handler"], "correct": 0},
        ]
    },
    {
        "title": "Basic Mathematics",
        "description": "Fundamental math concepts and problem solving",
        "category": "Mathematics",
        "difficulty": 1,
        "timeLimitSeconds": 300,  # 5 minutes
        "questions": [
            {"text": "What is 15 × 12?", "answers": ["180", "175", "190", "185"], "correct": 0},
            {"text": "What is the square root of 144?", "answers": ["12", "14", "10", "16"], "correct": 0},
            {"text": "If a triangle has angles of 60°, 60°, and 60°, what type of triangle is it?", "answers": ["Equilateral", "Isosceles", "Scalene", "Right"], "correct": 0},
            {"text": "What is 25% of 200?", "answers": ["50", "40", "60", "45"], "correct": 0},
        ]
    },
    {
        "title": "Advanced Physics",
        "description": "Challenging questions on quantum mechanics and relativity",
        "category": "Science",
        "difficulty": 3,
        "timeLimitSeconds": 900,  # 15 minutes
        "questions": [
            {"text": "What is the speed of light in vacuum?", "answers": ["299,792,458 m/s", "300,000,000 m/s", "250,000,000 m/s", "350,000,000 m/s"], "correct": 0},
            {"text": "Who proposed the theory of relativity?", "answers": ["Albert Einstein", "Isaac Newton", "Niels Bohr", "Max Planck"], "correct": 0},
            {"text": "What is Heisenberg's Uncertainty Principle about?", "answers": ["Position and momentum", "Energy and time", "Mass and velocity", "Force and acceleration"], "correct": 0},
            {"text": "What particle is responsible for mass according to the Standard Model?", "answers": ["Higgs boson", "Electron", "Neutron", "Photon"], "correct": 0},
            {"text": "What is quantum entanglement?", "answers": ["Correlated quantum states", "Particle collision", "Wave interference", "Energy transfer"], "correct": 0},
            {"text": "What does E=mc² represent?", "answers": ["Mass-energy equivalence", "Electric force", "Magnetic field", "Kinetic energy"], "correct": 0},
            {"text": "What is the Schwarzschild radius?", "answers": ["Event horizon of black hole", "Orbital radius", "Atomic radius", "Galaxy radius"], "correct": 0},
            {"text": "What is wave-particle duality?", "answers": ["Matter exhibits wave and particle properties", "Light is only a wave", "Particles are only solid", "Waves cannot be particles"], "correct": 0},
            {"text": "What is the Pauli Exclusion Principle?", "answers": ["No two fermions can occupy same quantum state", "Particles attract", "Energy is conserved", "Momentum is constant"], "correct": 0},
            {"text": "What is quantum superposition?", "answers": ["Particle in multiple states simultaneously", "Particle collision", "Wave addition", "Energy levels"], "correct": 0},
        ]
    },
    {
        "title": "Geography Quick Quiz",
        "description": "Fast-paced geography questions about countries and capitals",
        "category": "Geography",
        "difficulty": 1,
        "timeLimitSeconds": 180,  # 3 minutes
        "questions": [
            {"text": "What is the capital of France?", "answers": ["Paris", "London", "Berlin", "Madrid"], "correct": 0},
            {"text": "Which is the largest ocean?", "answers": ["Pacific", "Atlantic", "Indian", "Arctic"], "correct": 0},
            {"text": "What is the tallest mountain in the world?", "answers": ["Mount Everest", "K2", "Kilimanjaro", "Denali"], "correct": 0},
        ]
    },
    {
        "title": "Modern Music Industry",
        "description": "Questions about contemporary music, artists, and trends",
        "category": "Music",
        "difficulty": 2,
        "timeLimitSeconds": 420,  # 7 minutes
        "questions": [
            {"text": "Which artist has won the most Grammy Awards?", "answers": ["Beyoncé", "Taylor Swift", "Adele", "Jay-Z"], "correct": 0},
            {"text": "What does BPM stand for in music?", "answers": ["Beats Per Minute", "Bass Per Measure", "Band Performance Metric", "Beat Pattern Mode"], "correct": 0},
            {"text": "Which instrument has 88 keys?", "answers": ["Piano", "Organ", "Synthesizer", "Accordion"], "correct": 0},
            {"text": "What is the time signature of a waltz?", "answers": ["3/4", "4/4", "2/4", "6/8"], "correct": 0},
            {"text": "Who is known as the 'King of Pop'?", "answers": ["Michael Jackson", "Elvis Presley", "Prince", "David Bowie"], "correct": 0},
            {"text": "What is an octave in music?", "answers": ["8 notes interval", "8 beats", "8 instruments", "8 chords"], "correct": 0},
        ]
    },
    {
        "title": "Literature Classics",
        "description": "Famous books, authors, and literary movements",
        "category": "Literature",
        "difficulty": 2,
        "timeLimitSeconds": 360,  # 6 minutes
        "questions": [
            {"text": "Who wrote '1984'?", "answers": ["George Orwell", "Aldous Huxley", "Ray Bradbury", "Isaac Asimov"], "correct": 0},
            {"text": "What is the first line of 'Pride and Prejudice'?", "answers": ["It is a truth universally acknowledged...", "Call me Ishmael", "It was the best of times...", "In a hole in the ground..."], "correct": 0},
            {"text": "Who wrote 'To Kill a Mockingbird'?", "answers": ["Harper Lee", "Mark Twain", "Ernest Hemingway", "F. Scott Fitzgerald"], "correct": 0},
            {"text": "What is the setting of 'The Great Gatsby'?", "answers": ["1920s New York", "1950s California", "1930s Chicago", "1940s Boston"], "correct": 0},
            {"text": "Who wrote the Harry Potter series?", "answers": ["J.K. Rowling", "J.R.R. Tolkien", "C.S. Lewis", "Philip Pullman"], "correct": 0},
        ]
    },
    {
        "title": "Sports Champions",
        "description": "Test your knowledge of legendary athletes and sports records",
        "category": "Sports",
        "difficulty": 2,
        "timeLimitSeconds": 480,  # 8 minutes
        "questions": [
            {"text": "Who has won the most Olympic gold medals?", "answers": ["Michael Phelps", "Usain Bolt", "Carl Lewis", "Mark Spitz"], "correct": 0},
            {"text": "How many players are on a soccer team on the field?", "answers": ["11", "10", "12", "9"], "correct": 0},
            {"text": "What is a perfect score in bowling?", "answers": ["300", "200", "500", "100"], "correct": 0},
            {"text": "Who is known as 'The Greatest' in boxing?", "answers": ["Muhammad Ali", "Mike Tyson", "Floyd Mayweather", "Joe Frazier"], "correct": 0},
            {"text": "How long is a marathon?", "answers": ["26.2 miles", "20 miles", "30 miles", "25 miles"], "correct": 0},
            {"text": "What sport is played at Wimbledon?", "answers": ["Tennis", "Golf", "Cricket", "Rugby"], "correct": 0},
            {"text": "How many points is a touchdown in American football?", "answers": ["6", "7", "5", "8"], "correct": 0},
        ]
    },
    {
        "title": "Art History Masters",
        "description": "Famous paintings, artists, and art movements throughout history",
        "category": "Art",
        "difficulty": 2,
        "timeLimitSeconds": 360,  # 6 minutes
        "questions": [
            {"text": "Who painted the Mona Lisa?", "answers": ["Leonardo da Vinci", "Michelangelo", "Raphael", "Donatello"], "correct": 0},
            {"text": "What art movement was Pablo Picasso associated with?", "answers": ["Cubism", "Impressionism", "Surrealism", "Expressionism"], "correct": 0},
            {"text": "Who painted 'The Starry Night'?", "answers": ["Vincent van Gogh", "Claude Monet", "Paul Cézanne", "Edgar Degas"], "correct": 0},
            {"text": "What is the Sistine Chapel famous for?", "answers": ["Michelangelo's ceiling frescoes", "Leonardo's paintings", "Raphael's sculptures", "Botticelli's portraits"], "correct": 0},
            {"text": "Who sculpted 'The Thinker'?", "answers": ["Auguste Rodin", "Michelangelo", "Donatello", "Bernini"], "correct": 0},
        ]
    },
    {
        "title": "General Knowledge Trivia",
        "description": "Random facts from various topics",
        "category": "General Knowledge",
        "difficulty": 1,
        "timeLimitSeconds": 240,  # 4 minutes
        "questions": [
            {"text": "How many continents are there?", "answers": ["7", "6", "8", "5"], "correct": 0},
            {"text": "What is the largest planet in our solar system?", "answers": ["Jupiter", "Saturn", "Neptune", "Uranus"], "correct": 0},
            {"text": "What is the chemical symbol for gold?", "answers": ["Au", "Ag", "Fe", "Cu"], "correct": 0},
            {"text": "How many bones are in the human body?", "answers": ["206", "208", "204", "210"], "correct": 0},
            {"text": "What is the smallest country in the world?", "answers": ["Vatican City", "Monaco", "San Marino", "Liechtenstein"], "correct": 0},
            {"text": "What year did World War II end?", "answers": ["1945", "1944", "1946", "1943"], "correct": 0},
        ]
    },
    {
        "title": "Computer Science Fundamentals",
        "description": "Core CS concepts, algorithms, and data structures",
        "category": "Technology",
        "difficulty": 3,
        "timeLimitSeconds": 720,  # 12 minutes
        "questions": [
            {"text": "What is the worst-case time complexity of quicksort?", "answers": ["O(n²)", "O(n log n)", "O(n)", "O(log n)"], "correct": 0},
            {"text": "What is a hash collision?", "answers": ["Two keys map to same hash value", "Hash function fails", "Memory overflow", "Key not found"], "correct": 0},
            {"text": "What is the CAP theorem about?", "answers": ["Consistency, Availability, Partition tolerance", "CPU, Algorithms, Performance", "Cache, API, Protocol", "Code, Architecture, Performance"], "correct": 0},
            {"text": "What does ACID stand for in databases?", "answers": ["Atomicity, Consistency, Isolation, Durability", "Access, Control, Integration, Data", "Algorithm, Cache, Index, Database", "Application, Connection, Interface, Driver"], "correct": 0},
            {"text": "What is dynamic programming?", "answers": ["Solving problems by breaking into subproblems", "Runtime code generation", "Changing variables", "Memory allocation"], "correct": 0},
            {"text": "What is Big O notation used for?", "answers": ["Algorithm complexity analysis", "Memory size", "Code quality", "Error rates"], "correct": 0},
            {"text": "What is a binary search tree?", "answers": ["Tree where left < node < right", "Tree with two children", "Tree sorted by size", "Tree with binary values"], "correct": 0},
            {"text": "What is polymorphism in OOP?", "answers": ["Objects can take multiple forms", "Multiple inheritance", "Many classes", "Code duplication"], "correct": 0},
            {"text": "What is a RESTful API?", "answers": ["Stateless web service architecture", "Database query language", "Programming paradigm", "Security protocol"], "correct": 0},
        ]
    },
    {
        "title": "World Capitals Challenge",
        "description": "Name the capitals of countries around the world",
        "category": "Geography",
        "difficulty": 2,
        "timeLimitSeconds": 420,  # 7 minutes
        "questions": [
            {"text": "What is the capital of Japan?", "answers": ["Tokyo", "Kyoto", "Osaka", "Hiroshima"], "correct": 0},
            {"text": "What is the capital of Australia?", "answers": ["Canberra", "Sydney", "Melbourne", "Brisbane"], "correct": 0},
            {"text": "What is the capital of Canada?", "answers": ["Ottawa", "Toronto", "Vancouver", "Montreal"], "correct": 0},
            {"text": "What is the capital of Brazil?", "answers": ["Brasília", "Rio de Janeiro", "São Paulo", "Salvador"], "correct": 0},
            {"text": "What is the capital of Egypt?", "answers": ["Cairo", "Alexandria", "Giza", "Luxor"], "correct": 0},
            {"text": "What is the capital of India?", "answers": ["New Delhi", "Mumbai", "Bangalore", "Kolkata"], "correct": 0},
        ]
    },
    {
        "title": "Biology Basics",
        "description": "Fundamental concepts in biology and life sciences",
        "category": "Science",
        "difficulty": 1,
        "timeLimitSeconds": 300,  # 5 minutes
        "questions": [
            {"text": "What is the powerhouse of the cell?", "answers": ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"], "correct": 0},
            {"text": "What is photosynthesis?", "answers": ["Plants converting light to energy", "Animal respiration", "Cell division", "Protein synthesis"], "correct": 0},
            {"text": "What is DNA?", "answers": ["Deoxyribonucleic acid", "Dynamic nuclear acid", "Dual nucleic arrangement", "Direct nucleus adapter"], "correct": 0},
            {"text": "How many chromosomes do humans have?", "answers": ["46", "44", "48", "50"], "correct": 0},
            {"text": "What is the largest organ in the human body?", "answers": ["Skin", "Liver", "Heart", "Brain"], "correct": 0},
        ]
    },
    {
        "title": "Web Development Essentials",
        "description": "HTML, CSS, JavaScript, and modern web technologies",
        "category": "Technology",
        "difficulty": 2,
        "timeLimitSeconds": 480,  # 8 minutes
        "questions": [
            {"text": "What does HTML stand for?", "answers": ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language"], "correct": 0},
            {"text": "Which CSS property controls text size?", "answers": ["font-size", "text-size", "font-style", "text-style"], "correct": 0},
            {"text": "What is the DOM?", "answers": ["Document Object Model", "Data Object Management", "Dynamic Operation Mode", "Direct Output Method"], "correct": 0},
            {"text": "What is async/await in JavaScript?", "answers": ["Handling asynchronous operations", "Parallel execution", "Error handling", "Variable declaration"], "correct": 0},
            {"text": "What is a CSS flexbox?", "answers": ["Layout model for arranging items", "Color scheme", "Animation framework", "Text formatting"], "correct": 0},
            {"text": "What is the purpose of HTTP status code 404?", "answers": ["Not Found", "Success", "Server Error", "Unauthorized"], "correct": 0},
        ]
    },
    {
        "title": "Chemistry Concepts",
        "description": "Elements, compounds, and chemical reactions",
        "category": "Science",
        "difficulty": 2,
        "timeLimitSeconds": 540,  # 9 minutes
        "questions": [
            {"text": "What is the chemical formula for water?", "answers": ["H2O", "H2O2", "HO", "H3O"], "correct": 0},
            {"text": "What is the atomic number of Carbon?", "answers": ["6", "12", "8", "14"], "correct": 0},
            {"text": "What is the pH of pure water?", "answers": ["7", "0", "14", "10"], "correct": 0},
            {"text": "What is an ion?", "answers": ["Charged atom or molecule", "Neutral particle", "Energy unit", "Wave pattern"], "correct": 0},
            {"text": "What is oxidation?", "answers": ["Loss of electrons", "Gain of electrons", "Neutral reaction", "Temperature change"], "correct": 0},
            {"text": "What is the noble gas?", "answers": ["Helium", "Hydrogen", "Oxygen", "Nitrogen"], "correct": 0},
            {"text": "What is a covalent bond?", "answers": ["Sharing electrons", "Transfer of electrons", "Magnetic attraction", "Nuclear force"], "correct": 0},
        ]
    },
]

def log(message, level="INFO"):
    """Simple logging"""
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
            f"{GATEWAY_URL}/api/users/auth/login",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("Token")
            log(f"✓ Logged in as admin", "SUCCESS")
            return token
        else:
            log(f"Admin login failed: {response.status_code}", "ERROR")
            return ""
    except Exception as e:
        log(f"Admin login error: {str(e)}", "ERROR")
        return ""

def register_user(username: str, email: str, password: str) -> Tuple[bool, Dict]:
    """Register a new user"""
    payload = {
        "username": (None, username),
        "email": (None, email),
        "password": (None, password),
        "firstName": (None, username.split('_')[0].capitalize()),
        "lastName": (None, "User")
    }
    
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/users/auth/register",
            files=payload,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            token = data.get("token") or data.get("Token")
            user_id = data.get("user", {}).get("id") or data.get("User", {}).get("id")
            return True, {"username": username, "token": token, "id": user_id, "email": email}
        else:
            return False, {}
    except Exception as e:
        return False, {}

def create_quiz(token: str, template: Dict) -> str:
    """Create a quiz from template"""
    questions = []
    for q in template["questions"]:
        question_data = {
            "text": q["text"],
            "answers": [{"text": ans, "isCorrect": (i == q["correct"])} for i, ans in enumerate(q["answers"])]
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
            log(f"Quiz creation failed: {response.status_code} - {response.text[:100]}", "ERROR")
            return ""
    except Exception as e:
        log(f"Quiz creation error: {str(e)}", "ERROR")
        return ""

def get_quiz_with_questions(quiz_id: str, token: str) -> Dict:
    """Get quiz with questions"""
    try:
        response = requests.get(
            f"{GATEWAY_URL}/api/quizzes/{quiz_id}/with-questions",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        return {}
    except:
        return {}

def submit_quiz_result(token: str, quiz_id: str, quiz_data: Dict, accuracy: float = 0.75) -> bool:
    """Submit quiz result with specified accuracy"""
    questions = quiz_data.get("questions", [])
    
    answers = []
    correct_count = 0
    for question in questions:
        question_id = question.get("id")
        question_answers = question.get("answers", [])
        
        # Determine if answer should be correct based on accuracy
        if random.random() < accuracy and question_answers:
            correct_answer = next((a["text"] for a in question_answers if a.get("isCorrect")), None)
            given_answer = correct_answer if correct_answer else "Wrong"
            if correct_answer:
                correct_count += 1
        else:
            # Give wrong answer
            wrong_answers = [a["text"] for a in question_answers if not a.get("isCorrect")]
            given_answer = random.choice(wrong_answers) if wrong_answers else "Wrong Answer"
        
        answers.append({
            "questionId": question_id,
            "givenAnswer": given_answer
        })
    
    # Calculate realistic time based on number of questions (30-60 seconds per question)
    time_per_question = random.randint(30, 60)
    time_taken = len(questions) * time_per_question + random.randint(-30, 30)
    
    score = int((correct_count / len(questions)) * 100)
    
    result_data = {
        "quizId": quiz_id,
        "score": score,
        "timeTaken": time_taken,
        "answers": answers
    }
    
    try:
        response = requests.post(
            f"{GATEWAY_URL}/api/results/submit",
            json=result_data,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=30
        )
        
        return response.status_code in [200, 201]
    except:
        return False

def main():
    print("\n" + "="*70)
    print("         QuizHub Data Seeding Script")
    print("="*70 + "\n")
    
    # Login as admin
    log("Step 1: Logging in as admin...")
    admin_token = login_admin()
    if not admin_token:
        log("Failed to login as admin. Exiting.", "ERROR")
        return
    
    # Create quizzes
    log(f"\nStep 2: Creating {len(QUIZ_TEMPLATES)} diverse quizzes...")
    quiz_ids = []
    for i, template in enumerate(QUIZ_TEMPLATES, 1):
        quiz_id = create_quiz(admin_token, template)
        if quiz_id:
            quiz_ids.append(quiz_id)
            log(f"  [{i}/{len(QUIZ_TEMPLATES)}] ✓ Created: {template['title']}", "SUCCESS")
            time.sleep(0.5)  # Small delay between creations
        else:
            log(f"  [{i}/{len(QUIZ_TEMPLATES)}] ✗ Failed: {template['title']}", "ERROR")
    
    log(f"\n✓ Successfully created {len(quiz_ids)} quizzes", "SUCCESS")
    
    # Create diverse users
    log("\nStep 3: Creating 20 diverse users...")
    user_names = [
        "john_doe", "jane_smith", "alex_johnson", "maria_garcia", "david_lee",
        "sarah_wilson", "michael_brown", "emily_davis", "james_miller", "lisa_anderson",
        "robert_taylor", "jennifer_thomas", "william_jackson", "karen_white", "richard_harris",
        "susan_martin", "joseph_thompson", "nancy_martinez", "charles_robinson", "betty_clark"
    ]
    
    users = []
    for username in user_names:
        email = f"{username}@test.com"
        password = "Test123Pass!"
        success, user_data = register_user(username, email, password)
        if success:
            users.append(user_data)
            log(f"  ✓ Registered: {username}", "SUCCESS")
            time.sleep(0.3)
        else:
            log(f"  ⚠ Skipped (may exist): {username}", "WARNING")
    
    log(f"\n✓ Have {len(users)} users ready", "SUCCESS")
    
    # Generate realistic quiz submissions
    log(f"\nStep 4: Generating realistic quiz submissions...")
    submission_count = 0
    
    for user in users:
        # Each user takes 3-8 random quizzes
        num_quizzes = random.randint(3, 8)
        user_quiz_ids = random.sample(quiz_ids, min(num_quizzes, len(quiz_ids)))
        
        for quiz_id in user_quiz_ids:
            # Get quiz data
            quiz_data = get_quiz_with_questions(quiz_id, user["token"])
            if not quiz_data:
                continue
            
            # Vary accuracy: 20% poor (30-50%), 50% average (60-80%), 30% good (85-100%)
            rand = random.random()
            if rand < 0.2:
                accuracy = random.uniform(0.3, 0.5)  # Poor performance
            elif rand < 0.7:
                accuracy = random.uniform(0.6, 0.8)  # Average performance
            else:
                accuracy = random.uniform(0.85, 1.0)  # Good performance
            
            # Submit quiz
            if submit_quiz_result(user["token"], quiz_id, quiz_data, accuracy):
                submission_count += 1
                log(f"  ✓ {user['username']} completed quiz (accuracy: {int(accuracy*100)}%)", "SUCCESS")
            
            time.sleep(0.3)  # Small delay between submissions
    
    log(f"\n✓ Generated {submission_count} quiz submissions", "SUCCESS")
    
    print("\n" + "="*70)
    print("              Data Seeding Complete!")
    print("="*70)
    print(f"\n📊 Summary:")
    print(f"   • Quizzes created: {len(quiz_ids)}")
    print(f"   • Users registered: {len(users)}")
    print(f"   • Quiz submissions: {submission_count}")
    print(f"\n🌐 Access your seeded data at: {GATEWAY_URL}\n")

if __name__ == "__main__":
    main()
