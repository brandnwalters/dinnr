-- Meal period hours (from the tab label, e.g. 'Brunch (11am-3pm)') and a
-- hall's open/closed status for the day. Times are local America/New_York
-- wall-clock times. A page with no meal periods is saved as 'closed'.

alter table meal_period
    add column start_time time,             -- null if the label has no hours we can read
    add column end_time   time;

alter table menu_day
    add column status text not null default 'open' check (status in ('open', 'closed'));
