#!/usr/bin/env python3
import requests
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
import os
from pathlib import Path

class APITestSuite:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.test_project_id = None
        self.test_container_ids = []  # Store multiple container IDs
        self.test_message_ids = []    # Store message IDs for annotations
        self.api_prefix = "/api/v1"  # Default to new API version
        
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        token: Optional[str] = None,
        files: Optional[Dict[str, Any]] = None,
        use_legacy_api: bool = False
    ) -> requests.Response:
        """Make an HTTP request to the API"""
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        # Use legacy API if requested, otherwise use API prefix
        if use_legacy_api:
            url = f"{self.base_url}{endpoint}"
        else:
            # Don't double prefix if the endpoint already includes the prefix
            if endpoint.startswith(self.api_prefix):
                url = f"{self.base_url}{endpoint}"
            else:
                url = f"{self.base_url}{self.api_prefix}{endpoint}"
        
        print(f"Making {method} request to: {url}")
        
        if files:
            response = requests.request(method, url, headers=headers, files=files)
        else:
            if data and method != "GET":
                headers["Content-Type"] = "application/json"
                response = requests.request(method, url, headers=headers, json=data)
            elif data and method == "GET":
                response = requests.request(method, url, headers=headers, params=data)
            else:
                response = requests.request(method, url, headers=headers)
        
        print(f"Response status: {response.status_code}")
        return response

    def _safe_json(self, response):
        """Safely attempt to parse JSON response, returning the text on failure"""
        try:
            return response.json()
        except json.JSONDecodeError:
            return {"error": "Invalid JSON response", "content": response.text[:500]}

    def test_admin_auth(self, email: str = "admin@example.com", password: str = "admin") -> bool:
        """Test admin authentication"""
        print("\n=== Testing Admin Authentication ===")
        
        # Try to login as admin
        data = {
            "username": email,
            "password": password
        }
        response = requests.post(
            f"{self.base_url}{self.api_prefix}/auth/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            self.admin_token = response.json()["access_token"]
            print("✅ Admin login successful")
            return True
        else:
            print("❌ Admin login failed:", self._safe_json(response))
            return False

    def test_create_test_user(self, email: str = "test@example.com", password: str = "test123") -> bool:
        """Test creating a regular user"""
        print("\n=== Testing User Creation ===")
        
        data = {
            "email": email,
            "password": password,
            "is_admin": False
        }
        
        response = self._make_request("POST", "/auth/register", data=data)
        
        if response.status_code in [200, 201, 400]:  # 400 means user might already exist
            print("✅ User creation successful or user already exists")
            return True
        else:
            print("❌ User creation failed:", self._safe_json(response))
            return False

    def test_user_auth(self, email: str = "test@example.com", password: str = "test123") -> bool:
        """Test user authentication"""
        print("\n=== Testing User Authentication ===")
        
        data = {
            "username": email,
            "password": password
        }
        response = requests.post(
            f"{self.base_url}{self.api_prefix}/auth/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            self.user_token = response.json()["access_token"]
            print("✅ User login successful")
            return True
        else:
            print("❌ User login failed:", self._safe_json(response))
            return False

    def test_get_project_types(self) -> bool:
        """Test fetching available project types from the registry"""
        print("\n=== Testing Project Types API ===")
        
        response = self._make_request("GET", "/projects/types", token=self.admin_token)
        
        if response.status_code == 200:
            project_types = response.json()
            print(f"✅ Successfully retrieved {len(project_types)} project types")
            for type_id, schema in project_types.items():
                print(f"  - {type_id}: {schema['name']}")
                print(f"    Data types: {schema['data_item_types']}")
                print(f"    Annotation types: {schema['annotation_types']}")
            return True
        else:
            print("❌ Failed to retrieve project types:", self._safe_json(response))
            return False

    def test_create_project(self, name: str = "Test Chat Project") -> bool:
        """Test creating a new project"""
        print("\n=== Testing Project Creation ===")
        
        data = {
            "name": name,
            "type": "chat_disentanglement",
            "description": "A test project for chat disentanglement"
            # Removing meta_data temporarily since we need a migration for that field
            # "meta_data": {
            #     "platform": "Discord",
            #     "channel_id": "test-channel"
            # }
        }
        
        response = self._make_request("POST", "/projects", data=data, token=self.admin_token)
        
        if response.status_code in [200, 201]:
            try:
                self.test_project_id = response.json()["id"]
                print("✅ Project creation successful")
                return True
            except (json.JSONDecodeError, KeyError) as e:
                print(f"❌ Project created but cannot parse ID: {e}")
                print(f"Response content: {response.text[:500]}")
                return False
        else:
            print("❌ Project creation failed:", self._safe_json(response))
            print(f"Response content: {response.text[:500]}")
            return False

    def test_assign_user_to_project(self) -> bool:
        """Test assigning a user to the project"""
        print("\n=== Testing Project Assignment ===")
        
        response = self._make_request(
            "POST",
            f"/projects/{self.test_project_id}/assign/2",  # Assuming test user ID is 2
            token=self.admin_token
        )
        
        if response.status_code in [200, 201, 204]:  # 204 means success with no content
            print("✅ User assignment successful")
            return True
        else:
            print("❌ User assignment failed:", self._safe_json(response))
            return False

    def test_import_chat_data_with_flexible_mapping(self) -> bool:
        """Test importing chat data with flexible field mapping"""
        print("\n=== Testing Flexible Chat Data Import ===")
        
        # Get test file path
        test_file = "uploads/VAC_R10.csv"
        test_file_dir = os.path.dirname(test_file)
        
        # Create the uploads directory if it doesn't exist
        if not os.path.exists(test_file_dir):
            os.makedirs(test_file_dir)
        
        # Create a simple test file if it doesn't exist
        if not os.path.exists(test_file):
            print(f"Creating test file {test_file}")
            with open(test_file, "w") as f:
                f.write("user_id,turn_id,turn_text,reply_to_turn\n")
                f.write("user1,1,Hello everyone,\n")
                f.write("user2,2,Hello user1,1\n")
                f.write("user3,3,What's the topic today?,\n")
                f.write("user1,4,We're discussing testing,3\n")
                f.write("user2,5,Great! I love testing,4\n")
        
        # Prepare flexible import configuration
        import_config = {
            "project_id": self.test_project_id,
            "container_name": f"Flexible Import - {Path(test_file).stem}",
            "import_type": "chat",
            "data_type": "chat_message",
            "field_mapping": [
                {
                    "source_field": "user_id",
                    "target_field": "user_id"
                },
                {
                    "source_field": "turn_id",
                    "target_field": "turn_id"
                },
                {
                    "source_field": "turn_text",
                    "target_field": "content"
                },
                {
                    "source_field": "reply_to_turn",
                    "target_field": "reply_to_turn",
                    "default_value": None
                },
                {
                    "source_field": "turn_text",
                    "target_field": "turn_text"
                }
            ]
        }
        
        files = {
            'file': (Path(test_file).name, open(test_file, 'rb'), 'text/csv'),
            'import_config': (None, json.dumps(import_config), 'application/json')
        }
        
        response = self._make_request(
            "POST",
            "/import/import",
            files=files,
            token=self.admin_token
        )
        
        if response.status_code in [200, 201]:
            container_id = int(response.json()["id"])
            self.test_container_ids.append(container_id)
            print(f"✅ Successfully imported with flexible mapping")
            
            # Store first few message IDs for annotation tests
            messages_response = self._make_request(
                "GET",
                f"/data/containers/{container_id}/items?limit=5",
                token=self.user_token
            )
            if messages_response.status_code == 200:
                message_ids = [msg["id"] for msg in messages_response.json()]
                self.test_message_ids.extend(message_ids)
                print(f"✅ Retrieved {len(message_ids)} message IDs for testing")
                return True
            else:
                print("❌ Failed to retrieve messages:", messages_response.text)
                return False
        else:
            print("❌ Failed to import with flexible mapping:", self._safe_json(response))
            print(f"Response content: {response.text[:500]}")
            return False

    def test_create_annotation_with_standard_api(self) -> bool:
        """Test creating an annotation using the new standard annotations API"""
        print("\n=== Testing Standard Annotations API ===")
        
        if not self.test_message_ids:
            print("❌ No message IDs available for annotation")
            return False
        
        # Create a thread annotation
        annotation_data = {
            "type": "thread",
            "data": {
                "thread_id": "test_thread_1",
                "confidence": 0.9,
                "notes": "This is a test thread annotation"
            },
            "item_id": self.test_message_ids[0]  # Include the item_id in the request body
        }
        
        response = self._make_request(
            "POST",
            f"/annotations/items/{self.test_message_ids[0]}/annotations",
            data=annotation_data,
            token=self.user_token
        )
        
        if response.status_code in [200, 201]:
            print("✅ Successfully created annotation with standard API")
            annotation_id = response.json()["id"]
            
            # Verify annotation
            get_response = self._make_request(
                "GET",
                f"/annotations/annotations/{annotation_id}",
                token=self.user_token
            )
            
            if get_response.status_code == 200:
                print("✅ Successfully retrieved created annotation")
                return True
            else:
                print("❌ Failed to retrieve created annotation:", get_response.text)
                return False
        else:
            print("❌ Failed to create annotation with standard API:", self._safe_json(response))
            print(f"Response content: {response.text[:500] if response.text else 'No response content'}")
            return False

    def test_get_container_annotations(self) -> bool:
        """Test retrieving all annotations for a container"""
        print("\n=== Testing Container Annotations API ===")
        
        if not self.test_container_ids:
            print("❌ No container IDs available for testing")
            return False
        
        # Get all annotations for the first container
        container_id = self.test_container_ids[0]
        
        response = self._make_request(
            "GET",
            f"/annotations/containers/{container_id}/annotations",
            token=self.user_token
        )
        
        if response.status_code == 200:
            annotations = response.json()
            print(f"✅ Successfully retrieved {len(annotations)} annotations for container")
            return True
        else:
            print("❌ Failed to retrieve container annotations:", response.text)
            return False

    def test_pagination_and_filtering(self) -> bool:
        """Test pagination and filtering for annotations"""
        print("\n=== Testing Pagination and Filtering ===")
        
        if not self.test_container_ids:
            print("❌ No container IDs available for testing")
            return False
        
        # Create a few more annotations if needed
        if len(self.test_message_ids) >= 3:
            for i in range(1, 3):
                annotation_data = {
                    "type": "thread",
                    "data": {
                        "thread_id": f"test_thread_{i+1}",
                        "confidence": 0.8 - (i * 0.1),
                        "notes": f"This is test thread annotation {i+1}"
                    },
                    "item_id": self.test_message_ids[i]  # Include the item_id in the request body
                }
                
                self._make_request(
                    "POST",
                    f"/annotations/items/{self.test_message_ids[i]}/annotations",
                    data=annotation_data,
                    token=self.user_token
                )
        
        # Test pagination
        container_id = self.test_container_ids[0]
        params = {
            "offset": 0,
            "limit": 2,
            "annotation_type": "thread"
        }
        
        response = self._make_request(
            "GET",
            f"/annotations/containers/{container_id}/annotations",
            data=params,
            token=self.user_token
        )
        
        if response.status_code == 200:
            annotations = response.json()
            print(f"✅ Successfully retrieved {len(annotations)} annotations with pagination")
            print(f"  Requested limit: 2, got: {len(annotations)}")
            
            # Test next page
            if len(annotations) == 2:
                params["offset"] = 2
                next_response = self._make_request(
                    "GET",
                    f"/annotations/containers/{container_id}/annotations",
                    data=params,
                    token=self.user_token
                )
                
                if next_response.status_code == 200:
                    next_annotations = next_response.json()
                    print(f"✅ Successfully retrieved next page with {len(next_annotations)} annotations")
                    return True
                else:
                    print("❌ Failed to retrieve next page:", next_response.text)
                    return False
            
            return True
        else:
            print("❌ Failed to test pagination:", response.text)
            return False

    def test_legacy_api_compatibility(self) -> bool:
        """Test backward compatibility with the legacy API endpoints"""
        print("\n=== Testing Legacy API Compatibility ===")
        
        # Test legacy project endpoint
        response = self._make_request(
            "GET",
            f"/projects/{self.test_project_id}",
            token=self.user_token,
            use_legacy_api=True
        )
        
        if response.status_code == 200:
            print("✅ Successfully retrieved project with legacy API")
            
            # Test legacy chat disentanglement endpoint
            if self.test_container_ids:
                container_id = self.test_container_ids[0]
                messages_response = self._make_request(
                    "GET",
                    f"/chat-disentanglement/containers/{container_id}/messages",
                    token=self.user_token,
                    use_legacy_api=True
                )
                
                if messages_response.status_code == 200:
                    messages = messages_response.json()
                    print(f"✅ Successfully retrieved {len(messages)} messages with legacy API")
                    return True
                else:
                    print("❌ Failed to retrieve messages with legacy API:", messages_response.text)
                    return False
            
            return True
        else:
            print("❌ Failed to retrieve project with legacy API:", response.text)
            return False

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("\n=== Running All API Tests ===")
        
        # First check API version
        response = requests.get(f"{self.base_url}/")
        if response.status_code == 200:
            api_info = response.json()
            print(f"API Version: {api_info.get('version', 'unknown')}")
            if api_info.get('api_prefix'):
                self.api_prefix = api_info['api_prefix']
                print(f"Using API prefix: {self.api_prefix}")
        
        # Authentication
        admin_auth = self.test_admin_auth()
        if not admin_auth:
            print("❌ Admin authentication failed - aborting further tests")
            return False
        
        user_created = self.test_create_test_user()
        if not user_created:
            print("❌ User creation failed - continuing with caution")
        
        user_auth = self.test_user_auth()
        if not user_auth:
            print("❌ User authentication failed - aborting further tests")
            return False
        
        # Project management
        project_types = self.test_get_project_types()
        if not project_types:
            print("❌ Failed to retrieve project types - continuing with caution")
        
        project_created = self.test_create_project()
        if not project_created:
            print("❌ Project creation failed - aborting further tests")
            return False
        
        user_assigned = self.test_assign_user_to_project()
        if not user_assigned:
            print("❌ User assignment failed - continuing with caution")
        
        # Data import and annotation
        import_success = self.test_import_chat_data_with_flexible_mapping()
        if not import_success:
            print("❌ Flexible data import failed - aborting further tests")
            return False
        
        annotation_created = self.test_create_annotation_with_standard_api()
        if not annotation_created:
            print("❌ Failed to create annotation - continuing with caution")
        
        annotations_fetched = self.test_get_container_annotations()
        if not annotations_fetched:
            print("❌ Failed to fetch container annotations - continuing with caution")
        
        pagination_tested = self.test_pagination_and_filtering()
        if not pagination_tested:
            print("❌ Pagination test failed - continuing with caution")
        
        # Backward compatibility
        legacy_api_tested = self.test_legacy_api_compatibility()
        if not legacy_api_tested:
            print("❌ Legacy API compatibility test failed")
            
        print("\n=== Test Suite Completed ===")
        return True


if __name__ == "__main__":
    # Create and run the test suite
    test_suite = APITestSuite()
    test_suite.run_all_tests() 