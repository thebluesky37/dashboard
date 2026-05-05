"""initial_schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-06 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'connections',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('dsn', sa.String(), nullable=False),
        sa.Column('database', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('dialect', sa.String(), nullable=True),
        sa.Column('is_sample', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('instructions', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_connections'),
        sa.UniqueConstraint('dsn', name='uq_connections_dsn'),
    )

    op.create_table(
        'user',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(100), nullable=True),
        sa.Column('openai_api_key', sa.String(), nullable=True),
        sa.Column('preferred_openai_model', sa.String(), nullable=True),
        sa.Column('langsmith_api_key', sa.String(), nullable=True),
        sa.Column('sentry_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('openai_base_url', sa.String(), nullable=True),
        sa.Column('analytics_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('hide_sql_preference', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('default_connection_id', sa.UUID(), nullable=True),
        sa.Column('hide_data_results', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(
            ['default_connection_id'], ['connections.id'],
            name='fk_user_default_connection_id_connections',
            ondelete='SET NULL',
        ),
        sa.PrimaryKeyConstraint('id', name='pk_user'),
    )

    op.create_table(
        'conversations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('connection_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('client_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(
            ['connection_id'], ['connections.id'],
            name='fk_conversations_connection_id_connections',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='pk_conversations'),
    )

    op.create_table(
        'media',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('blob', sa.LargeBinary(), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_media'),
    )

    op.create_table(
        'messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ['conversation_id'], ['conversations.id'],
            name='fk_messages_conversation_id_conversations',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='pk_messages'),
    )

    op.create_table(
        'results',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('message_id', sa.UUID(), nullable=False),
        sa.Column('linked_id', sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(
            ['message_id'], ['messages.id'],
            name='fk_results_message_id_messages',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='pk_results'),
    )


def downgrade() -> None:
    op.drop_table('results')
    op.drop_table('messages')
    op.drop_table('media')
    op.drop_table('conversations')
    op.drop_table('user')
    op.drop_table('connections')
