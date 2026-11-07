-- Today's menus: location -> menu_day -> meal_period -> menu_item (at a station).
-- Only the columns the tracer slice needs; later tickets add hours, status,
-- allergens, dietary tags, normalized names and nutrition in new migrations.

create table location (
    id   serial primary key,
    slug text not null unique,
    name text not null,
    url  text not null
);

-- One per location per date.
create table menu_day (
    id          serial primary key,
    location_id integer not null references location (id) on delete cascade,
    date        date not null,
    scraped_at  timestamptz not null default now(),
    unique (location_id, date)
);

create table meal_period (
    id          serial primary key,
    menu_day_id integer not null references menu_day (id) on delete cascade,
    name        text not null,          -- tab label without its hours, e.g. 'Brunch'
    position    integer not null,       -- tab order on the page
    unique (menu_day_id, name)
);

-- Shared across locations and days, keyed by name.
create table station (
    id   serial primary key,
    name text not null unique
);

-- The same recipe can appear at several stations in one meal period.
create table menu_item (
    id             serial primary key,
    meal_period_id integer not null references meal_period (id) on delete cascade,
    station_id     integer not null references station (id),
    recipe_id      integer not null,    -- UNC's data-recipe id
    name           text not null,
    position       integer not null,    -- page order within the meal period
    unique (meal_period_id, station_id, recipe_id)
);

create index menu_item_recipe_id_idx on menu_item (recipe_id);
