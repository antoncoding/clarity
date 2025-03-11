### Guide

This is basically an easy to kickoff project with NextJS and Supabase.

![alt text](https://github.com/adaOctopus/nextjs-auth-supabase/blob/main/signinpage.png)

(Shout out to those guys, that made the UI template https://github.com/NextAdminHQ/nextjs-admin-dashboard -  
I did the integration of Supabase and the implementation of the Auth related stuff)

It has:
1. Login page
2. Dashboard ready to start editing and kickoff your project
3. Login with Google, Magic Link, Anonymous Signin.

### How to run

1. First clone the repo locally
2. Make sure you `cd` into the directory
3. Run the following command to install dependencies 
```
pnpm install
```
4. If it gives you error, try
```
pnpm install --force
```
5. The above should work.
6. Create a .env file
7. At the root of the project
8. And put the following variables
```
NEXT_PUBLIC_SUPABASE_URL=your-projects-url-from-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SITE_URL=http://localhost:3000
```
9. In production, change the SITE_URL accordingly
10. Make sure you have created account in Supabase, in order to have all the variables needed to run.
11. Once you are done run ``` pnpm dev ``` to run the project locally. 

### How to configure the Supabase side

1. Create your account and create the Users table (online you can find guides for that)
2. Make sure you enable Email, Google signin and Anonymous Signins (under Authentication/Signin/Ups in the dashboard)
3. Make sure you go to Authentication/Emails and you copy paste the following in the field:
```
<h2>Magic Link</h2>

<p>Follow this link to login:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Log In</a></p>
```
4. For the Google auth you will need to setup client IDs etc. That is something you can see how to do here
https://www.youtube.com/watch?v=gAMYk-ls1sQ&t=838s&ab_channel=ArtemKirsanov