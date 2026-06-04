Claude, follow these instructions exactly. Do not add extra features that are not requested. Do not add filler. Keep the current app style and format as much as possible.

1. Project Setup

* The uploaded folder is a standalone frontend folder.
* Use this folder as the main style and format for the mobile app.
* Add this folder into the project.
* Remove any extra files that are not needed.
* Do not change the current style or format too much.
* Make the platform functional while keeping the same design direction.

2. Main Goal

* Make the entire app actually functional.
* Make every button and feature work correctly.
* Make the app polished enough for the Apple App Store.
* Make the app user-friendly, organized, easy to navigate, and visually polished.
* Do not leave broken buttons, unfinished screens, fake data, or non-working features.

3. API Keys and Services

* Connect all needed API keys and make sure they work.
* Connect the RobotEvents API key to the platform.
* Connect Google Auth.
* Connect the AI tools.
* Connect anything needed for messaging and email invites.
* Do not hard-code private keys directly into the app.
* Use environment variables where needed.
* Tell me exactly what keys, services, or setup information you need from me for:

  * RobotEvents API
  * Google Auth
  * AI features
  * Messaging
  * Sending teammate invite emails

4. Remove Preloaded Data

* Remove all pre-loaded information from the platform.
* The app should feel like a new user is entering for the first time.
* Do not show fake teams, fake robot data, fake matches, or fake tournament information.
* Data should come from the user’s selected team and RobotEvents.

5. First-Time User Flow

* When users first open the app, prompt them to sign in with Google Auth to unlock more tools.
* Also prompt users to enter their team.
* When users enter their team, show search suggestions from RobotEvents.
* Users must select one of the RobotEvents suggestions so they cannot enter a fake team name or team number.
* Add a “Use as Guest” option.
* Guest users should be able to use the app with limited features.
* If users do not sign in or do not select a valid team, lock or limit features that require an account or team data.

6. Team Settings

* In Settings, allow users to change their selected team.
* Make this feature polished because the whole platform depends on the selected team.
* When the team is changed, update all team-based data across the app.
* In Settings, allow users to enter teammate information such as teammate emails.
* Teammates should receive an email invite to either:

  * Create an account and download the app
  * Connect their account to the team
* Tell me exactly what is needed to send these emails.

7. Profile Settings

* In Settings, allow users to change their profile picture.
* Users should be able to choose from preloaded icons and symbols.
* Users should also be able to upload an image from their device.
* Users should be able to change their display name.
* The display name and profile picture should show in Messages and shared team features like To-Do lists.

8. Navigation and Menu Changes

* Remove AI Lessons.
* Only keep AI Chat.
* Remove Robots from the menu.
* Improve the menu design.
* Make the bottom menu bar more sleek, modern, and polished while still matching the current app style.
* Add page and button animations that make the app feel premium.
* Do not make the animations distracting.


10. Team Search Features

When users search for a team, they should be able to see:

* Team information
* Team stats
* Tournaments the team participated in
* Matches the team played
* Match scores
* Awards the team received

Users should be able to click on tournaments the team participated in.

11. Tournament Search Features

When users view a tournament, they should be able to see:

* All participating teams
* Match list
* Match scores
* Which teams went against each other
* Awards handed out at the tournament
* Which teams received each award
* Whether the tournament was States Qualified
* Whether the tournament was Worlds Qualified
* The correct field for each match
* The correct match number
* The estimated time the team should show up for the match

Use RobotEvents data for this.

12. Match Result Notifications

* Add notifications based on the user’s selected team.
* After a match, use RobotEvents data to detect the result.
* Send a dynamic notification showing the score.
* If the user’s team wins, the notification should congratulate the user.
* If the user’s team loses, the notification should still be positive and motivating.
* If the user’s team wins an award at a tournament, send a polished award notification.
* Notifications should look nice, dynamic, and team-specific.

13. AI Match Predictions

* For every match in the future, the AI should predict who is most likely to win.
* When viewing a future tournament, show AI prediction data under each future match.
* Add a small bar under the match showing:

  * Probability of each team or alliance winning
  * Percentage chance for each team or alliance
* Do not show AI confidence.
* Remove any “Confidence” text or confidence display from the app.
* If the AI prediction is wrong, send that result back into the prediction system so future estimates improve.
* Any AI tool that makes wrong predictions or wrong outputs should learn from the mistake and improve next time.

14. Award Qualification Feature

* Add a feature that shows which teams qualify for each award.
* Use VEX award rules and game-specific requirements.
* This feature is for all VEX, not just V5 or VRC.
* Research the rules for each VEX game and award.
* For every award at a tournament, show:

  * Which teams qualify for the award
  * Which teams are most likely to win the award
  * Why they qualify if the data is available
* If an award has a rule like top 30% or other requirements, apply that rule correctly.
* Make this feature very polished, easy to understand, and visually clean.

15. Add Scout Notes

Add a functional feature for creating new scout notes.

Users should be able to:

* Select a tag for the team
* Attach images
* Rate the team with stars based on useful categories
* Write a description about the team

You do not need to include every possible rating category, but the feature must be useful and functional.

16. Add Scout Screen Fix

* Make sure the Add Scout screen fits properly on a mobile screen.
* Right now the page looks too big.
* Resize and adjust the layout so the full screen works correctly on mobile.
* Make sure nothing is cut off, hidden, or hard to use.

17. AI Chat Changes

* Remove AI Lessons and only keep AI Chat.
* Remove the AI confidence display.
* Make the AI chat box a bit smaller because the current height gets cut off by the menu bar.
* When the user writes more text, the input box should grow upward instead of downward.
* Allow image upload in AI Chat.
* Allow video upload in AI Chat.
* Keep the AI Chat design consistent with the rest of the app.

18. Messages Page

* Add a Messages page.
* Users should be able to message each other based on email.
* Messages should only work if the user is signed in with Google Auth.
* The messages feature must actually work.
* Allow image upload in Messages.
* Allow video upload in Messages.
* Make the Messages page polished and user-friendly.
* Tell me exactly what you need from me to make messaging work.

19. To-Do List Feature

* On the Home page, add a To-Do List section at the bottom.
* When users select it, it should open a To-Do List page.
* Do not add the To-Do List page to the menu bar.
* Users should be able to add To-Do list items.
* The To-Do List should support individual and shared team task lists.
* Shared team tasks should be optional.

20. To-Do List Requirements

The To-Do List should include useful robotics task features:

* Shared team task lists
* Assign tasks to teammates
* Due dates
* Time alerts
* Priority levels
* Tags
* Smart filtered views
* Subtasks
* Attachments
* Notes
* Sections or columns
* Flagged important tasks
* Repeating tasks
* Tournament-related reminders

21. To-Do List Categories

Create useful task views such as:

* Assigned to Me
* Due Today
* Robot Fixes
* Notebook Tasks
* Tournament Prep
* Scouting Tasks

22. To-Do Task Fields

Each task should be able to include:

* Title
* Assigned teammate
* Due date
* Priority
* Tag
* Status
* Subtasks
* Attachments or photos
* Comments or notes

23. To-Do AI Tools

Add useful AI tools for tasks, such as:

* Break this task into steps
* Turn this into a notebook entry
* Estimate parts needed
* Create a tournament checklist

Only add these if they fit cleanly into the current app style.

24. Accent Color Setting

* In Settings, allow users to choose the accent color of the platform.
* The selected accent color should apply consistently across the app.
* Keep the design polished and consistent.

25. Final Quality Requirements

Before finishing, check that:

* All requested features are complete.
* All buttons work.
* All pages fit properly on mobile.
* The bottom menu does not cover important content.
* The app has no unnecessary files.
* The app has no fake preloaded data.
* RobotEvents data is connected.
* Google Auth is connected.
* Messages work.
* To-Do lists work.
* AI Chat works.
* Team selection works.
* Settings work.
* Notifications work.
* The app still matches the current style and format.
* The app is functional, polished, and ready to move toward App Store submission.


AI Image and Video Analysis
Allow users to upload images to the AI Coach.
Allow users to record videos directly inside the app and send them to the AI Coach.
Allow users to upload videos from their device and send them to the AI Coach.
The AI must be able to analyze images and videos.
The AI should be able to look at a robot image or video and explain what needs to be fixed.
Example:
User: “Help me fix my chassis based on this image.”
AI: “Here are a few suggestions and why they work. Also, you should fix this quickly because you have a match coming up soon at Field 2, Match 3.”
AI Coach Intelligence
The AI Coach must have strong knowledge about VEX, VEX events, tournament structure, awards, matches, fields, scouting, robots, strategy, notebooks, and team preparation.
The AI Coach should understand all VEX programs, not just V5 or VRC.
The AI Coach should be able to answer scenario-based questions intelligently.
The AI Coach should have preloaded VEX context so it gives useful answers without sounding basic.
The AI Coach should be connected to the rest of the platform.
When giving answers, the AI should use available platform data such as:
Selected team
Upcoming matches
Tournament schedule
Match field
Match number
RobotEvents data
Scout notes
Team tasks
Uploaded images
Uploaded videos
Match-Aware AI Responses
Every time the AI responds, it should check if the user’s team has a match coming up soon.
If a match is coming up soon, the AI should acknowledge it naturally in the response.
The AI should mention useful details when available, such as:
Match number
Field number
Estimated time
Opposing teams
Alliance partners
The AI should not randomly mention match information unless it is actually relevant or time-sensitive.
AI Coach Personality
The AI Coach should be compassionate, friendly, helpful, and easy to understand.
The AI should sound supportive, not robotic.
The AI should explain what to fix, why it matters, and what to do next.
The AI should format responses clearly with headings, bullets, and short sections.
The AI responses should look much better visually and be easier to read.
Live AI Coach Experience
Build the AI Coach to feel similar to a polished live AI assistant experience.
The user should be able to send text, images, and videos.
The AI should respond with useful analysis and next steps.
The feature should feel smooth, premium, and functional.
Make this feature highly polished because it is one of the main features of the app.
AI Sources
After every AI response, show a “Sources” option.
When users click “Sources,” they should be able to see the sources the AI used.
Source links should be clickable.
Sources should include relevant links, RobotEvents data, VEX resources, or other connected platform data when used.
This is needed so users can verify where the AI got its information.
AI Accuracy
Every AI feature on the platform should use connected platform data and sources whenever possible to reduce wrong answers.
AI responses should not rely only on guessing.
If the AI is using tournament, match, team, award, or RobotEvents information, it should use real connected data.
If the AI is unsure, it should say what it is unsure about instead of pretending.
If an AI prediction or answer is wrong, save that result so the system can improve future responses and predictions.


Also make sign in with google pop up at the begining showing at the top of the screen instead of the botton. After the user have answered that pop up, another popup similiar to the google AUTH popup will open up, allowing users to set their robotics teams or continue as guest which has less features. IF the users decides to set their team, they will use a similiar search to google, as they search robot events will find similiar teams and let them choose which one, this is to prevent people from entering fake teams.