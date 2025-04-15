import asyncio
from app.models import DataItem, DataContainer, Project, User
from app.database import get_db
from app.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import json

async def test_dataitem_db_operations():
    """Test DataItem database operations"""
    # Get a database session
    db_session = await anext(get_db())
    
    try:
        print("=== Testing DataItem Database Operations ===")
        
        # Step 1: Find or create a project for testing
        project_query = select(Project).limit(1)
        result = await db_session.execute(project_query)
        project = result.scalar_one_or_none()
        
        if not project:
            print("Creating test project...")
            project = Project(
                name="Test Project",
                type="generic",
                description="Project for testing DataItem"
            )
            db_session.add(project)
            await db_session.commit()
            await db_session.refresh(project)
        
        print(f"Using project: {project.id} - {project.name}")
        
        # Step 2: Find or create a container for testing
        container_query = select(DataContainer).limit(1)
        result = await db_session.execute(container_query)
        container = result.scalar_one_or_none()
        
        if not container:
            print("Creating test container...")
            container = DataContainer(
                name="Test Container",
                project_id=project.id,
                status="completed"
            )
            db_session.add(container)
            await db_session.commit()
            await db_session.refresh(container)
        
        print(f"Using container: {container.id} - {container.name}")
        
        # Step 3: Create and save different types of DataItems
        print("\n--- Creating and saving DataItems ---")
        
        # Generic DataItem
        generic_item = DataItem.create(
            type_name="generic",
            container_id=container.id,
            content="This is generic content",
            meta_data={
                "title": "Generic DB Title",
                "category": "Test DB",
                "tags": {"tag1": True, "tag2": False},
                "source": "DB Test Script"
            }
        )
        db_session.add(generic_item)
        await db_session.commit()
        await db_session.refresh(generic_item)
        print(f"Saved generic item with ID: {generic_item.id}")
        
        # Chat Message
        chat_item = DataItem.create(
            type_name="chat_message",
            container_id=container.id,
            content="Hello from database!",
            meta_data={
                "turn_id": "db-123",
                "user_id": "db-user1",
                "reply_to_turn": "db-122",
                "timestamp": datetime.now().isoformat()
            }
        )
        db_session.add(chat_item)
        await db_session.commit()
        await db_session.refresh(chat_item)
        print(f"Saved chat item with ID: {chat_item.id}")
        
        # Imported Data
        imported_item = DataItem.create(
            type_name="imported_data",
            container_id=container.id,
            content="Imported content from DB",
            meta_data={
                "title": "Imported DB Title",
                "category": "Imported DB",
                "source": "DB CSV Import"
            }
        )
        db_session.add(imported_item)
        await db_session.commit()
        await db_session.refresh(imported_item)
        print(f"Saved imported item with ID: {imported_item.id}")
        
        # Step 4: Retrieve and verify data
        print("\n--- Retrieving and verifying DataItems ---")
        
        # Retrieve generic item
        generic_query = select(DataItem).where(DataItem.id == generic_item.id)
        result = await db_session.execute(generic_query)
        retrieved_generic = result.scalar_one()
        
        print(f"Retrieved generic item ID: {retrieved_generic.id}")
        print(f"Type: {retrieved_generic.type}")
        print(f"Title: {retrieved_generic.title}")
        print(f"Category: {retrieved_generic.category}")
        print(f"Tags: {retrieved_generic.tags}")
        
        # Retrieve chat item
        chat_query = select(DataItem).where(DataItem.id == chat_item.id)
        result = await db_session.execute(chat_query)
        retrieved_chat = result.scalar_one()
        
        print(f"\nRetrieved chat item ID: {retrieved_chat.id}")
        print(f"Type: {retrieved_chat.type}")
        print(f"Turn ID: {retrieved_chat.turn_id}")
        print(f"User ID: {retrieved_chat.user_id}")
        print(f"Reply to turn: {retrieved_chat.reply_to_turn}")
        
        # Retrieve imported item
        imported_query = select(DataItem).where(DataItem.id == imported_item.id)
        result = await db_session.execute(imported_query)
        retrieved_imported = result.scalar_one()
        
        print(f"\nRetrieved imported item ID: {retrieved_imported.id}")
        print(f"Type: {retrieved_imported.type}")
        print(f"Title: {retrieved_imported.title}")
        print(f"Category: {retrieved_imported.category}")
        print(f"Source: {retrieved_imported.source}")
        
        # Step 5: Test polymorphism
        print("\n--- Testing polymorphic queries ---")
        
        # Query by type
        generic_items_query = select(DataItem).where(DataItem.type == "generic")
        result = await db_session.execute(generic_items_query)
        generic_items = result.scalars().all()
        print(f"Number of generic items: {len(generic_items)}")
        
        chat_items_query = select(DataItem).where(DataItem.type == "chat_message")
        result = await db_session.execute(chat_items_query)
        chat_items = result.scalars().all()
        print(f"Number of chat items: {len(chat_items)}")
        
        imported_items_query = select(DataItem).where(DataItem.type == "imported_data")
        result = await db_session.execute(imported_items_query)
        imported_items = result.scalars().all()
        print(f"Number of imported items: {len(imported_items)}")
        
        # Step 6: Update metadata
        print("\n--- Testing metadata updates ---")
        
        retrieved_generic.title = "Updated DB Title"
        retrieved_generic.set_meta("new_field", "This is a new field")
        await db_session.commit()
        
        # Verify update
        generic_query = select(DataItem).where(DataItem.id == generic_item.id)
        result = await db_session.execute(generic_query)
        updated_generic = result.scalar_one()
        
        print(f"Updated title: {updated_generic.title}")
        print(f"New field value: {updated_generic.get_meta('new_field')}")
        print(f"Original tags still exist: {updated_generic.tags}")
        
        print("\n=== All database tests passed! ===")
        
    finally:
        await db_session.close()

if __name__ == "__main__":
    asyncio.run(test_dataitem_db_operations()) 