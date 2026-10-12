from django.db import migrations

TABLES = ["auditevent", "casehistory", "payment", "evidence", "custodyevent"]

def protect(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute("""CREATE FUNCTION rasd_deny_record_mutation() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'Legal and financial records are append-only'; END;
    $$ LANGUAGE plpgsql;""")
    for name in TABLES:
        schema_editor.execute(f"CREATE TRIGGER immutable_{name} BEFORE UPDATE OR DELETE ON platform_core_{name} FOR EACH ROW EXECUTE FUNCTION rasd_deny_record_mutation()")

def reverse(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for name in TABLES:
        schema_editor.execute(f"DROP TRIGGER immutable_{name} ON platform_core_{name}")
    schema_editor.execute("DROP FUNCTION rasd_deny_record_mutation()")

class Migration(migrations.Migration):
    dependencies = [("platform_core", "0001_initial")]
    operations = [migrations.RunPython(protect, reverse)]

