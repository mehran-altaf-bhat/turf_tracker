# Turf Payment Tracker

Tracks weekly Friday football turf payments (₹200/person, 8-10pm) for a
group. Users log in, mark their UPI payment as made, and see their
history. Admin confirms/rejects payments and adds new Friday sessions.

Stack: FastAPI + Jinja2 + HTMX, Supabase (Postgres + Auth), deployed on Vercel.

## 1. Supabase setup

1. Create a project at supabase.com.
2. In the SQL Editor, run the contents of `schema.sql` (included in this
   project) to create the tables and the auto-profile trigger.
3. Under Project Settings > API, copy your Project URL, anon key, and
   service_role key.
4. The **first user who signs up will not automatically be an admin** —
   after signing up once, go to the Supabase Table Editor, open
   `profiles`, and manually change that row's `role` to `admin`.

## 2. Local setup

```bash
cd turf-tracker
python -m venv venv
source venv/bin/activate      # venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env          # then fill in your Supabase values
uvicorn main:app --reload
```

Visit http://127.0.0.1:8000

## 3. Deploying to Vercel

1. Push this project to a GitHub repo.
2. On vercel.com, "Add New Project" and import the repo.
3. In the Vercel project's Environment Variables, add `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (same values as
   your `.env`).
4. Deploy. Vercel will pick up `vercel.json` and run `main.py` as a
   Python serverless function automatically.

## Notes / things to double check

- Row Level Security is OFF on these tables by default — access control
  is enforced entirely in the FastAPI route code (`auth.require_admin`,
  `auth.get_current_user`). This was a deliberate choice for simplicity;
  it means the service-role key is trusted and must stay secret.
- Payments are self-reported: a user marks "I paid ₹X" with an optional
  UPI reference, and the admin confirms it after checking their own
  UPI app/bank. There's no live payment gateway integration.
- Admin has to add each Friday's session manually (or you could later
  add a small script/cron to auto-create the next Friday each week).
- Email confirmation for signup is controlled in Supabase under
  Authentication > Settings — turn it off while testing so you don't
  need to click a verification email each time.
