import asyncio
import httpx
import json
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:8000"
TEST_USER = {
    "email": "test@example.com",
    "password": "testpassword123"
}

async def test_auth():
    async with httpx.AsyncClient() as client:
        # Register test user
        try:
            response = await client.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "email": TEST_USER["email"],
                    "password": TEST_USER["password"],
                    "is_admin": False
                }
            )
            print("Register response:", response.json())
        except httpx.HTTPError as e:
            print(f"Error registering user: {e}")
            # User might already exist, try to login
            pass

        # Login
        response = await client.post(
            f"{BASE_URL}/api/auth/token",
            data={
                "username": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
        )
        print("Login response:", response.json())
        return response.json()["access_token"]

async def test_annotations(token: str):
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a project
        project_data = {
            "name": "Test Chat Project",
            "type": "chat_disentanglement",
            "description": "Test project for chat disentanglement"
        }
        response = await client.post(
            f"{BASE_URL}/api/projects/",
            json=project_data,
            headers=headers
        )
        print("Create project response:", response.json())
        project_id = response.json()["id"]

        # Create a data container
        container_data = {
            "name": "Test Chat Container",
            "project_id": project_id,
            "meta_data": {"source": "test"}
        }
        response = await client.post(
            f"{BASE_URL}/api/containers/",
            json=container_data,
            headers=headers
        )
        print("Create container response:", response.json())
        container_id = response.json()["id"]

        # Create a test chat message
        message_data = {
            "container_id": container_id,
            "content": "Hello, this is a test message!",
            "type": "chat_message",
            "meta_data": {
                "user_id": "user1",
                "turn_id": "turn1",
                "turn_text": "Hello, this is a test message!",
                "reply_to_turn": None
            }
        }
        response = await client.post(
            f"{BASE_URL}/api/items/",
            json=message_data,
            headers=headers
        )
        print("Create message response:", response.json())
        message_id = response.json()["id"]

        # Create an annotation
        annotation_data = {
            "item_id": message_id,
            "type": "thread",
            "data": {
                "thread_id": "thread1",
                "confidence": 0.95,
                "notes": "Test annotation"
            }
        }
        response = await client.post(
            f"{BASE_URL}/api/annotations/",
            json=annotation_data,
            headers=headers
        )
        print("Create annotation response:", response.json())

        # Get all annotations for the message
        response = await client.get(
            f"{BASE_URL}/api/items/{message_id}/annotations",
            headers=headers
        )
        print("Get annotations response:", response.json())

async def main():
    token = await test_auth()
    await test_annotations(token)

if __name__ == "__main__":
    asyncio.run(main()) 