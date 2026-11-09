-- Starter sources. Feed URLs must be checked when the project is set up; several
-- governments change feed addresses without notice. The scanner records failures.

insert into public.sources (id, name, kind, tier, country_code, feed_url, feed_format) values
  -- Tier 1: official
  ('fcdo', 'FCDO travel advice', 'government', 1, 'GB', 'https://www.gov.uk/foreign-travel-advice.atom', 'atom'),
  ('us-state', 'US State Department', 'government', 1, 'US', 'https://travel.state.gov/_res/rss/TAsTWs.xml', 'rss'),
  ('smartraveller', 'Smartraveller', 'government', 1, 'AU', null, null),
  ('dfa-ie', 'DFA Ireland', 'government', 1, 'IE', null, null),
  ('ca-travel', 'Travel.gc.ca', 'government', 1, 'CA', null, null),
  ('who', 'WHO Disease Outbreak News', 'health-agency', 1, null, 'https://www.who.int/api/news/diseaseoutbreaknews', 'json'),
  ('cdc', 'CDC Travel Health Notices', 'health-agency', 1, 'US', 'https://wwwnc.cdc.gov/travel/rss/notices.xml', 'rss'),
  ('ecdc', 'ECDC', 'health-agency', 1, null, null, null),
  -- Tier 2: data services
  ('usgs', 'USGS earthquakes', 'data-service', 2, null, 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_hour.atom', 'atom'),
  ('gdacs', 'GDACS', 'data-service', 2, null, 'https://www.gdacs.org/xml/rss.xml', 'rss'),
  -- Tier 3: news allow-list (feeds added per country after licence check)
  ('reuters', 'Reuters', 'news-agency', 3, null, null, null),
  ('ap', 'Associated Press', 'news-agency', 3, null, null, null),
  ('afp', 'AFP', 'news-agency', 3, null, null, null),
  ('bbc', 'BBC News', 'broadcaster', 3, 'GB', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'rss'),
  ('dw', 'DW', 'broadcaster', 3, 'DE', 'https://rss.dw.com/rdf/rss-en-all', 'rss')
on conflict (id) do nothing;
