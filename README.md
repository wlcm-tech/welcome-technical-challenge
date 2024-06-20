# Welcome Technical Challenge

(Arturo's Fork)

Technical challenge issued by Welcome Workdays, completed in approximately 25 hours over the course of 2 weeks. The application is deployed to a free Heroku dyno (so please excuse slow first load) here: https://welcome-technical-challenge-c46e96d49546.herokuapp.com/

## Assignment

### Specifications

This challenge is based on the typical library scenario, where the application should do (at least) the following:

-Manage book inventory (Create, Read, Update, Delete)  
-Browse through inventory (search)  
-Check-in / Check-out books  
-Visualize the books you have borrowed, and which ones are already returned  
-Login / verify identity through a 3rd party service (OAuth2), f.eks: Google, Facebook, MS, etc.

You have free tech selection, but it is desirable that the resulting application is fully cloud native and can be either deployed anywhere or run as a standalone demo with a one-liner (for example using docker). The code should be on a public GitHub repo, with extra points for a proper (but simple) git-process, including a nice README, clean commit history, etc.

### My solution

#### Technologies

This is a Nuxt3 application using Vue3 (composition API) & TypeScript, Vuetify (component library & theme), Pinia (store), Mongoose & MongoDB (database), SASS (styling), Google OAuth2 (authentication), Docker (deployment) and Yarn (package manager).

#### Highlights

- CI/CD pipeline deploying a Docker image to Heroku on push to `main`
- As the app is lightweight and largely SSR-enabled, it is super fast
- Books are loaded lazily through backend pagination
  - automatically on "scroll to bottom" for users
  - through pagination controls for admin table
- The layout is highly fluid and has been made to be responsive
- A focus on UI & UX has led to
  - A simple yet beautiful UI
  - Ease of use with options to borrow several books through a cart as well as single-click borrowing
  - Smooth prompting for login when necessary
  - Notifying the user
    - On successes
    - On errors
    - When books are not available
- Consistent API with both public endpoints, auth-protected endpoints as well as admin-only endpoints

#### Potential improvements (if I had more time)

1. Backend validation of payload data
2. Better error handling and messages from backend
3. Add automatic testing (both e2e and component)
4. Fixing minor bugs (there are minor things I've discovered but not had time to fix)
5. Add more OAuth2 methods (Facebook, Apple, LinkedIn etc...)
6. Find a better way to handle roles (currently just stored in database)
7. Improve accessibility with aria-labels etc. and manual testing with a screen reader

#### Reflections

I was aware from the beginning that this was a large project, and I would not be able to create the application to the standard of quality I would like in a timely manner. I started by planning out my technologies and roughly prioritizing tasks and features. While automatic testing is extremely important in real-world projects, it takes time and effort to set up, and is virtually useless when not given the time and attention required. I therefore decided to spend my time completing the required features instead. Once the planning was done, I set up the repository and CI/CD pipeline. Once I had a boilerplate project deployed successfully through that pipeline, I started development. I worked on the frontend and backend interchangeably feature-by-feature, doing manual testing all throughout development.

## Running the project

### Setup

Make sure to install the dependencies:

```bash
yarn  install
```

And add the following environment variables in a `.env` file

1. SIDEBASE_AUTH_SECRET
2. MONGODB_URI
3. GOOGLE_CLIENT_ID
4. GOOGLE_CLIENT_SECRET

### Development Server

Start the development server on `http://localhost:3000`:

```bash
yarn  dev
```

### Production

Build the application for production:

```bash
yarn  build
```

Locally preview production build:

```bash
yarn  preview
```
