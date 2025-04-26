import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))

import graphviz
from sqlalchemy.orm import class_mapper

from app.models import (
    User, Project, ProjectAssignment,
    DataContainer, DataItem,
    Annotation, ThreadAnnotation,
    ImportedData, ChatMessage
)

def create_erd_diagram():
    """Create an Entity Relationship Diagram."""
    dot = graphviz.Digraph(comment='Entity Relationship Diagram')
    
    # Global graph settings
    dot.attr(rankdir='LR')  # Left to right layout
    dot.attr(size='8.3,11.7')  # A4 size in inches
    dot.attr(ratio='fill')  # Fill the page while maintaining aspect ratio
    dot.attr(nodesep='0.6')  # Further increased space between nodes
    dot.attr(ranksep='0.7')  # Further increased space between ranks
    dot.attr(fontsize='14')  # Larger font size
    dot.attr(splines='polyline')  # Use polyline for more flexible edge routing
    dot.attr(concentrate='true')  # Merge multiple edges
    dot.attr(overlap='false')  # Prevent node overlap
    dot.attr(compound='true')  # Allow edges between clusters
    
    # Node settings
    dot.attr('node', 
             shape='record',
             style='filled',
             fillcolor='#f8f8f8',
             fontsize='14',
             margin='0.1,0.1')  # Reduce margins
    
    # Edge settings
    dot.attr('edge',
             fontsize='12',
             arrowsize='0.7',
             penwidth='1.0',  # Thinner lines
             labelfontsize='10',  # Smaller label font
             labelfontname='Arial',  # More readable font
             labeldistance='1.0',  # Keep labels closer to lines
             labelangle='0',  # Keep labels parallel to lines
             decorate='true',  # Add line to connect label to edge
             minlen='4')  # Further increased minimum edge length

    # Group related models into subgraphs for better organization
    with dot.subgraph(name='cluster_users') as c:
        c.attr(label='User Management')
        c.attr(style='rounded,filled')
        c.attr(fillcolor='#f0f0f0')
        c.attr(color='lightgray')
        c.node('User')
        c.node('ProjectAssignment')

    with dot.subgraph(name='cluster_projects') as c:
        c.attr(label='Projects')
        c.attr(style='rounded,filled')
        c.attr(fillcolor='#f0f0f0')
        c.attr(color='lightgray')
        c.node('Project')
        c.node('DataContainer')

    with dot.subgraph(name='cluster_data') as c:
        c.attr(label='Data Management')
        c.attr(style='rounded,filled')
        c.attr(fillcolor='#f0f0f0')
        c.attr(color='lightgray')
        c.node('DataItem')
        c.node('ImportedData')
        c.node('ChatMessage')

    with dot.subgraph(name='cluster_annotations') as c:
        c.attr(label='Annotations')
        c.attr(style='rounded,filled')
        c.attr(fillcolor='#f0f0f0')
        c.attr(color='lightgray')
        c.node('Annotation')
        c.node('ThreadAnnotation')

    # Process each model
    models = [
        User, Project, ProjectAssignment,
        DataContainer, DataItem,
        Annotation, ThreadAnnotation,
        ImportedData, ChatMessage
    ]

    for model in models:
        mapper = class_mapper(model)
        table_name = mapper.class_.__name__

        # Create node for the table
        attributes = []
        for column in mapper.columns:
            if column.name not in ['id', 'created_at', 'updated_at']:  # Skip common fields for clarity
                type_name = str(column.type).split('(')[0]  # Simplify type names
                attributes.append(f"+ {column.name}: {type_name}")

        label = f"{table_name}|" + "\\l".join(attributes) + "\\l"
        dot.node(table_name, label)

        # Add relationships with constraints
        for relationship in mapper.relationships:
            target = relationship.mapper.class_.__name__
            relationship_type = {
                'MANYTOONE': '1..*',
                'ONETOMANY': '*..1',
                'MANYTOMANY': '*..*',
                'ONETOONE': '1..1'
            }.get(relationship.direction.name, relationship.direction.name)
            
            # Add constraints to control edge routing
            dot.edge(table_name, target, 
                    label=f"{relationship.key}\\n({relationship_type})",
                    constraint='true',  # Force edge to affect node ranking
                    minlen='4',  # Further increased minimum edge length
                    taillabel='',  # Use headlabel/taillabel for better positioning
                    headlabel='')  # Use main label instead

    return dot

def create_inheritance_diagram():
    """Create a diagram showing model inheritance relationships."""
    dot = graphviz.Digraph(comment='Model Inheritance')
    
    # Global graph settings
    dot.attr(rankdir='TB')
    dot.attr(size='8.3,11.7')  # A4 size in inches
    dot.attr(ratio='fill')  # Fill the page while maintaining aspect ratio
    dot.attr(nodesep='0.6')  # Further increased space between nodes
    dot.attr(ranksep='0.7')  # Further increased space between ranks
    dot.attr(fontsize='14')  # Larger font size
    dot.attr(splines='polyline')  # Use polyline for more flexible edge routing
    dot.attr(concentrate='true')  # Merge multiple edges
    
    # Node settings
    dot.attr('node',
             shape='box',
             style='filled',
             fillcolor='#e6f3ff',
             fontsize='14',
             margin='0.1,0.1')  # Reduce margins
    
    # Edge settings
    dot.attr('edge',
             fontsize='12',
             arrowsize='0.7',
             penwidth='1.0',  # Thinner lines
             labelfontsize='10',  # Smaller label font
             labelfontname='Arial',  # More readable font
             labeldistance='1.0',  # Keep labels closer to lines
             labelangle='0',  # Keep labels parallel to lines
             decorate='true',  # Add line to connect label to edge
             minlen='4')  # Further increased minimum edge length

    # Define inheritance relationships
    inheritance_map = {
        'DataItem': ['ImportedData', 'ChatMessage'],
        'Annotation': ['ThreadAnnotation']
    }

    for parent, children in inheritance_map.items():
        dot.node(parent, parent)
        for child in children:
            dot.node(child, child)
            dot.edge(parent, child, style='dashed', label='inherits')

    return dot

def main():
    """Generate schema visualizations."""
    # Create output directory if it doesn't exist
    output_dir = Path(__file__).parent / 'docs' / 'schema'
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate ERD diagram
    erd_diagram = create_erd_diagram()
    erd_diagram.render(str(output_dir / 'erd'), format='png', cleanup=True)
    print(f"Generated ERD diagram at {output_dir}/erd.png")

    # Generate inheritance diagram
    inheritance_diagram = create_inheritance_diagram()
    inheritance_diagram.render(str(output_dir / 'inheritance'), format='png', cleanup=True)
    print(f"Generated inheritance diagram at {output_dir}/inheritance.png")

if __name__ == '__main__':
    main() 