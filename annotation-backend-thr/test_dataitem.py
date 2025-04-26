import asyncio
from app.models import DataItem, ChatMessage, ImportedData
from app.database import get_db
from app.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json

async def test_dataitem_structure():
    """Test the DataItem structure with different types of data"""
    # Get a database session
    db_session = await anext(get_db())
    
    try:
        print("=== Testing DataItem Structure ===")
        
        # Test 1: Create a generic DataItem
        generic_item = DataItem.create(
            type_name="generic",
            container_id=1,  # Assuming container 1 exists
            content="This is generic content",
            meta_data={
                "title": "Generic Title",
                "category": "Test",
                "tags": {"tag1": True, "tag2": False},
                "source": "Test Script"
            }
        )
        
        # Test accessors
        print(f"Generic item type: {generic_item.type}")
        print(f"Generic item title: {generic_item.title}")
        print(f"Generic item category: {generic_item.category}")
        print(f"Generic item tags: {generic_item.tags}")
        print(f"Generic item source: {generic_item.source}")
        print(f"Is generic type: {generic_item.is_type('generic')}")
        print()
        
        # Test 2: Create a ChatMessage item
        chat_item = DataItem.create(
            type_name="chat_message",
            container_id=1,
            content="Hello world!",
            meta_data={
                "turn_id": "123",
                "user_id": "user1",
                "reply_to_turn": "122",
                "timestamp": datetime.now().isoformat()
            }
        )
        
        # Test chat-specific accessors
        print(f"Chat item type: {chat_item.type}")
        print(f"Chat item turn_id: {chat_item.turn_id}")
        print(f"Chat item user_id: {chat_item.user_id}")
        print(f"Chat item reply_to_turn: {chat_item.reply_to_turn}")
        print(f"Chat item timestamp: {chat_item.timestamp}")
        print(f"Is chat type: {chat_item.is_type('chat_message')}")
        print()
        
        # Test 3: Create an ImportedData item
        imported_item = DataItem.create(
            type_name="imported_data",
            container_id=1,
            content="Imported content",
            meta_data={
                "title": "Imported Title",
                "category": "Imported",
                "source": "CSV Import"
            }
        )
        
        # Test imported data accessors
        print(f"Imported item type: {imported_item.type}")
        print(f"Imported item title: {imported_item.title}")
        print(f"Imported item category: {imported_item.category}")
        print(f"Imported item source: {imported_item.source}")
        print(f"Is imported type: {imported_item.is_type('imported_data')}")
        print()
        
        # Test 4: Test setting values
        generic_item.set_meta("new_field", "new value")
        print(f"New field value: {generic_item.get_meta('new_field')}")
        
        generic_item.title = "Updated Title"
        print(f"Updated title: {generic_item.title}")
        
        chat_item.turn_id = "456"
        print(f"Updated turn_id: {chat_item.turn_id}")
        print()
        
        # Test 5: Create a custom type
        custom_item = DataItem.create(
            type_name="custom_type",
            container_id=1,
            content="Custom content",
            meta_data={
                "custom_field1": "value1",
                "custom_field2": 123,
                "nested": {
                    "field1": "nested1",
                    "field2": "nested2"
                }
            }
        )
        
        print(f"Custom item type: {custom_item.type}")
        print(f"Custom field1: {custom_item.get_meta('custom_field1')}")
        print(f"Custom field2: {custom_item.get_meta('custom_field2')}")
        print(f"Nested field1: {custom_item.get_meta('nested', {}).get('field1')}")
        print(f"Is custom type: {custom_item.is_type('custom_type')}")
        print()
        
        # Test 6: Test null safety
        null_item = DataItem.create(
            type_name="generic",
            container_id=1,
            content="Empty metadata",
            meta_data=None
        )
        
        print(f"Null item type: {null_item.type}")
        null_item.title = "Title for null item"
        print(f"Setting title on null metadata: {null_item.title}")
        print(f"Metadata after setting: {null_item.meta_data}")
        print()
        
        print("=== All tests passed! ===")
        
    finally:
        await db_session.close()

if __name__ == "__main__":
    asyncio.run(test_dataitem_structure()) 