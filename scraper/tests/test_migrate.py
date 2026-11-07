import psycopg

from dinnr.migrate import migrate


def test_repo_migrations_apply_to_a_fresh_database(fresh_database_url):
    migrate(fresh_database_url)

    with psycopg.connect(fresh_database_url) as conn:
        assert conn.execute("select 1").fetchone() == (1,)


def test_migrations_run_in_order_and_only_once(fresh_database_url, tmp_path):
    (tmp_path / "0001_create_widget.sql").write_text(
        "create table widget (id serial primary key, name text not null);"
    )
    (tmp_path / "0002_seed_widget.sql").write_text(
        "insert into widget (name) values ('sprocket');"
    )

    migrate(fresh_database_url, migrations_dir=tmp_path)
    migrate(fresh_database_url, migrations_dir=tmp_path)

    with psycopg.connect(fresh_database_url) as conn:
        names = conn.execute("select name from widget").fetchall()
    assert names == [("sprocket",)]


def test_a_failing_migration_leaves_no_partial_changes(fresh_database_url, tmp_path):
    (tmp_path / "0001_broken.sql").write_text(
        "create table half_done (id int); select * from no_such_table;"
    )

    try:
        migrate(fresh_database_url, migrations_dir=tmp_path)
    except psycopg.Error:
        pass
    else:
        raise AssertionError("expected the broken migration to fail")

    with psycopg.connect(fresh_database_url) as conn:
        exists = conn.execute("select to_regclass('half_done')").fetchone()
    assert exists == (None,)
