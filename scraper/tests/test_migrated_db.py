def test_tests_can_talk_to_a_migrated_test_database(db):
    assert db.execute("select current_database()").fetchone()[0].startswith("dinnr")
    assert db.execute("select 1 + 1").fetchone() == (2,)
