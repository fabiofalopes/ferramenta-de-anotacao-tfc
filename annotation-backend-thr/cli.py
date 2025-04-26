import requests
import json
from typing import Optional, Dict, Any
import os
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt, Confirm
from rich import print as rprint

console = Console()

class APIClient:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.api_prefix = "/api/v1"
        self.token: Optional[str] = None
        self.current_user: Optional[Dict[str, Any]] = None

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, files: Optional[Dict] = None) -> requests.Response:
        """Make an HTTP request to the API"""
        url = f"{self.base_url}{self.api_prefix}{endpoint}"
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        if method == "GET":
            return requests.get(url, headers=headers)
        elif method == "POST":
            if files:
                return requests.post(url, headers=headers, files=files, data=data)
            return requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            return requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            return requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

    def login(self, email: str, password: str) -> bool:
        """Login to the API"""
        try:
            response = requests.post(
                f"{self.base_url}{self.api_prefix}/auth/token",
                data={"username": email, "password": password},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if response.status_code == 200:
                self.token = response.json()["access_token"]
                # Get current user info
                user_response = self._make_request("GET", "/auth/me")
                if user_response.status_code == 200:
                    self.current_user = user_response.json()
                    console.print(f"[green]Successfully logged in as {self.current_user['email']}[/green]")
                    return True
            console.print(f"[red]Login failed: {response.text}[/red]")
            return False
        except Exception as e:
            console.print(f"[red]Error during login: {str(e)}[/red]")
            return False

    def list_projects(self) -> None:
        """List all projects"""
        response = self._make_request("GET", "/projects")
        if response.status_code == 200:
            projects = response.json()
            table = Table(title="Projects")
            table.add_column("ID", style="cyan")
            table.add_column("Name", style="magenta")
            table.add_column("Type", style="green")
            table.add_column("Description", style="yellow")
            
            for project in projects:
                table.add_row(
                    str(project["id"]),
                    project["name"],
                    project["type"],
                    project.get("description", "")
                )
            console.print(table)
        else:
            console.print(f"[red]Failed to list projects: {response.text}[/red]")

    def list_messages(self, project_id: int) -> None:
        """List messages in a project"""
        response = self._make_request("GET", f"/chat/projects/{project_id}/messages")
        if response.status_code == 200:
            messages = response.json()
            table = Table(title=f"Messages in Project {project_id}")
            table.add_column("ID", style="cyan")
            table.add_column("User", style="magenta")
            table.add_column("Content", style="green")
            table.add_column("Reply To", style="yellow")
            
            for msg in messages:
                table.add_row(
                    str(msg["id"]),
                    msg["user_id"],
                    msg["content"],
                    str(msg["reply_to_turn"] or "")
                )
            console.print(table)
        else:
            console.print(f"[red]Failed to list messages: {response.text}[/red]")

    def create_annotation(self, message_id: int, thread_id: str, confidence: float, notes: str = "") -> None:
        """Create a thread annotation for a message"""
        data = {
            "thread_id": thread_id,
            "confidence": confidence,
            "notes": notes
        }
        response = self._make_request("POST", f"/chat/messages/{message_id}/thread", data=data)
        if response.status_code == 200:
            console.print("[green]Annotation created successfully[/green]")
        else:
            console.print(f"[red]Failed to create annotation: {response.text}[/red]")

    def list_threads(self, project_id: int) -> None:
        """List thread annotations in a project"""
        response = self._make_request("GET", f"/chat/projects/{project_id}/threads")
        if response.status_code == 200:
            threads = response.json()
            for thread_id, messages in threads.items():
                table = Table(title=f"Thread {thread_id}")
                table.add_column("Message ID", style="cyan")
                table.add_column("Content", style="magenta")
                table.add_column("Annotator", style="green")
                table.add_column("Confidence", style="yellow")
                
                for msg in messages:
                    table.add_row(
                        str(msg["turn_id"]),
                        msg["message_content"],
                        msg["annotator"]["email"],
                        str(msg["confidence"])
                    )
                console.print(table)
        else:
            console.print(f"[red]Failed to list threads: {response.text}[/red]")

def main():
    client = APIClient()
    
    while True:
        console.print("\n[bold]Annotation Tool CLI[/bold]")
        console.print("1. Login")
        console.print("2. List Projects")
        console.print("3. List Messages")
        console.print("4. Create Annotation")
        console.print("5. List Threads")
        console.print("6. Exit")
        
        choice = Prompt.ask("Choose an option", choices=["1", "2", "3", "4", "5", "6"])
        
        if choice == "1":
            email = Prompt.ask("Email")
            password = Prompt.ask("Password", password=True)
            client.login(email, password)
        
        elif choice == "2":
            client.list_projects()
        
        elif choice == "3":
            project_id = Prompt.ask("Project ID", type=int)
            client.list_messages(project_id)
        
        elif choice == "4":
            message_id = Prompt.ask("Message ID", type=int)
            thread_id = Prompt.ask("Thread ID")
            confidence = Prompt.ask("Confidence (0-1)", type=float)
            notes = Prompt.ask("Notes (optional)")
            client.create_annotation(message_id, thread_id, confidence, notes)
        
        elif choice == "5":
            project_id = Prompt.ask("Project ID", type=int)
            client.list_threads(project_id)
        
        elif choice == "6":
            break

if __name__ == "__main__":
    main() 