import requests
import json

# Login to get a fresh token
login_data = {
    'username': 'admin@example.com', 
    'password': 'admin' # Assuming default password
}
login_response = requests.post('http://localhost:8001/auth/token', data=login_data)

if login_response.status_code == 200:
    token_data = login_response.json()
    print(f"New Token: {token_data['access_token']}")
    print(f"Token Type: {token_data['token_type']}")
else:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)

# Comment out the rest of the script for now
"""
# Get containers
response = requests.get('http://localhost:8001/data/containers/project/1', headers=headers)
print(f'Containers response: {response.status_code}')
containers = response.json()
print(f'Found {len(containers)} containers')

# Function to fetch items for a container using both endpoints
def test_container_endpoints(container_id):
    print(f"Testing container {container_id}")
    
    # Try data/containers endpoint
    data_url = f'http://localhost:8001/data/containers/{container_id}/items'
    data_response = requests.get(data_url, headers=headers)
    print(f'  Data items response: {data_response.status_code}')
    if data_response.status_code != 200:
        print(f'  Data items error: {data_response.json()}')
    
    # Try chat-disentanglement endpoint
    chat_url = f'http://localhost:8001/chat-disentanglement/containers/{container_id}/messages'
    chat_response = requests.get(chat_url, headers=headers)
    print(f'  Chat messages response: {chat_response.status_code}')
    if chat_response.status_code != 200:
        print(f'  Chat messages error: {chat_response.json()}')

# Try to update container status to "completed"
def update_container_status(container_id):
    print(f"\nAttempting to update container {container_id} status to 'completed'")
    
    # Use a PATCH request to update the container status
    update_url = f'http://localhost:8001/data/containers/{container_id}'
    update_data = {'status': 'completed'}
    
    update_response = requests.patch(update_url, headers=headers, json=update_data)
    print(f'  Update response: {update_response.status_code}')
    
    if update_response.status_code < 300:
        print('  Container status updated successfully!')
        return True
    else:
        print(f'  Update error: {update_response.text}')
        
        # Try a different endpoint
        alt_url = f'http://localhost:8001/admin/containers/{container_id}'
        alt_response = requests.patch(alt_url, headers=headers, json=update_data)
        print(f'  Alternative update response: {alt_response.status_code}')
        
        if alt_response.status_code < 300:
            print('  Container status updated successfully using alternative endpoint!')
            return True
        else:
            print(f'  Alternative update error: {alt_response.text}')
            return False

# Loop through containers
for c in containers:
    container_id = c['id']
    print(f"\n==== Container ID: {container_id}, Name: {c['name']}, Status: {c['status']} ====")
    
    # Test current access
    test_container_endpoints(container_id)
    
    # Try to update status
    if c['status'] != 'completed':
        success = update_container_status(container_id)
        
        # Test again after update attempt
        if success:
            print("\nTesting endpoints after status update:")
            test_container_endpoints(container_id)

# Now let's check the API implementation
print("\n==== Checking API implementation ====")
result = requests.get('http://localhost:8001/openapi.json', headers=headers)
if result.status_code == 200:
    api_spec = result.json()
    print("API endpoints:")
    for path, methods in api_spec.get('paths', {}).items():
        if 'containers' in path:
            print(f"  {path}")
            for method, details in methods.items():
                print(f"    {method.upper()}: {details.get('summary', 'No summary')}")
else:
    print(f"Failed to fetch API spec: {result.status_code}")
""" 