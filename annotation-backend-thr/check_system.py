from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models import Base, User, Project, ChatMessage, Annotation, ThreadAnnotation, ProjectAssignment
from rich.console import Console
from rich.table import Table
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection - using SQLite
DATABASE_URL = "sqlite:///./annotation.db"
engine = create_engine(DATABASE_URL, echo=True)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

console = Console()

def print_system_info():
    """Print basic system information"""
    session = SessionLocal()
    
    # Print users
    users = session.query(User).all()
    user_table = Table(title="Users")
    user_table.add_column("ID", style="cyan")
    user_table.add_column("Email", style="magenta")
    user_table.add_column("Is Admin", style="green")
    
    for user in users:
        user_table.add_row(
            str(user.id),
            user.email,
            str(user.is_admin)
        )
    console.print(user_table)
    
    # Print projects
    projects = session.query(Project).all()
    project_table = Table(title="Projects")
    project_table.add_column("ID", style="cyan")
    project_table.add_column("Name", style="magenta")
    project_table.add_column("Type", style="green")
    project_table.add_column("Description", style="yellow")
    
    for project in projects:
        project_table.add_row(
            str(project.id),
            project.name,
            project.type,
            project.description or ""
        )
    console.print(project_table)
    
    # Print project assignments
    assignments = session.query(ProjectAssignment).all()
    assignment_table = Table(title="Project Assignments")
    assignment_table.add_column("Project ID", style="cyan")
    assignment_table.add_column("User ID", style="magenta")
    
    for assignment in assignments:
        assignment_table.add_row(
            str(assignment.project_id),
            str(assignment.user_id)
        )
    console.print(assignment_table)
    
    # Print chat messages
    messages = session.query(ChatMessage).all()
    message_table = Table(title="Chat Messages")
    message_table.add_column("ID", style="cyan")
    message_table.add_column("Project ID", style="magenta")
    message_table.add_column("User ID", style="green")
    message_table.add_column("Content", style="yellow")
    
    for message in messages:
        message_table.add_row(
            str(message.id),
            str(message.project_id),
            str(message.user_id),
            message.content[:50] + "..." if len(message.content) > 50 else message.content
        )
    console.print(message_table)
    
    # Print annotations
    annotations = session.query(Annotation).all()
    annotation_table = Table(title="Annotations")
    annotation_table.add_column("ID", style="cyan")
    annotation_table.add_column("Message ID", style="magenta")
    annotation_table.add_column("User ID", style="green")
    annotation_table.add_column("Thread ID", style="yellow")
    
    for annotation in annotations:
        annotation_table.add_row(
            str(annotation.id),
            str(annotation.message_id),
            str(annotation.user_id),
            str(annotation.thread_id)
        )
    console.print(annotation_table)
    
    session.close()

if __name__ == "__main__":
    print_system_info() 