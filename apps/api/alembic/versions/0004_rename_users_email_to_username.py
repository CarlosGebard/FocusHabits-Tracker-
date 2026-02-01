"""
rename users email to username (safe)
fix unique constraint name
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)

    columns = {c["name"] for c in insp.get_columns("users")}
    constraints = {c["name"] for c in insp.get_unique_constraints("users")}

    with op.batch_alter_table("users") as batch:
        # 1) Si existe email y no username → rename real
        if "email" in columns and "username" not in columns:
            if "users_email_key" in constraints:
                batch.drop_constraint("users_email_key", type_="unique")

            batch.alter_column(
                "email",
                new_column_name="username",
                existing_type=sa.String(length=255),
                existing_nullable=False,
            )

            batch.create_unique_constraint("users_username_key", ["username"])

        # 2) Si ya existe username (tu caso actual)
        elif "username" in columns:
            # si el unique tiene nombre viejo, lo corregimos
            if "users_email_key" in constraints:
                batch.drop_constraint("users_email_key", type_="unique")

            if "users_username_key" not in constraints:
                batch.create_unique_constraint("users_username_key", ["username"])


def downgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)

    columns = {c["name"] for c in insp.get_columns("users")}
    constraints = {c["name"] for c in insp.get_unique_constraints("users")}

    with op.batch_alter_table("users") as batch:
        if "username" in columns and "email" not in columns:
            if "users_username_key" in constraints:
                batch.drop_constraint("users_username_key", type_="unique")

            batch.alter_column(
                "username",
                new_column_name="email",
                existing_type=sa.String(length=255),
                existing_nullable=False,
            )

            batch.create_unique_constraint("users_email_key", ["email"])
