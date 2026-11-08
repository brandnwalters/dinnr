-- Stations whose items shouldn't be part of meal combos (condiments, beverages,
-- cereal, ...). Set by the scraper from the station name on every run (rule in
-- scraper/src/dinnr/stations.py), so existing rows pick it up on the next scrape.
-- The web app leaves these stations out of combos unless the user opts in.

alter table station add column excluded_from_combos boolean not null default false;
