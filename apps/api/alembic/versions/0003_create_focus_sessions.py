"""create focus sessions

Revision ID: 0003
Revises: 0002
Create Date: 2026-01-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "focus_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("paused_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("paused_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_focus_sessions_user_started_at",
        "focus_sessions",
        ["user_id", "started_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_focus_sessions_user_started_at", table_name="focus_sessions")
    op.drop_table("focus_sessions")
