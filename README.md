# LifecycleManager

## Purpose 

Lifecycle Manager is a simple node.js application to handle most if not all user lifecycle tasks. This app was written to be modular with new functions and API calls to be added as tasks for user lifecycle increase. For new 3rd party app calls please add to the `API` directory and then import your new module into the corresponding tasks you'd like it ran during processing (i.e. `onboarding`, `offboarding`...). 

This application is self-sustaining and user actions (activation/deactivation) should automatically happen on the relevant date and time defined by the users timezone and date fields in the db. For items like contractors or immediate deactivations involving involuntary separations the web frontend can be used for GUI control.

## Backend
A Postgres based CloudSQL instance is used for the backend with a database simply called `LCM`. Credentials can be in `.env` file or setup to connect via GCP SQL proxy 

### Tables
The following tables exist in the db in order to organize and keep logs for each action LCM takes:

* active_users (used in conjunction with IGA for application access checking)
* application_matrix (used for mapping apps and their assignment groups)
* atlassian_groups (used for mapping Atlassian group IDs to give users access to Atlassian tools)
* groups_lookup (used for okta group mapping)
* offboarding
* onboarding
* user_applications ( used for cloning a users profile for a new user)
* user_groups ( used for cloning users profile for new user)

## Modules

### API

All 3rd party API calls that require functions. We are currently using:

#### Atlassian

Primarily used for ticketing surrounding lifecycle action and leaving comments on existing tickets with actions taken. 

#### Google

Google Workspace actions for new and departing users

* Account creation / Alias Creation
* Onboarding Cal Event Invites
* Account Deactivation / Alias Removal
* Drive Transfer
* Email Fwd'ing

#### Jamf

Laptop/Mobile device lookups and locking on deactivation

#### KnowBe4

Lookup if new users have completed security training in their first 30 days and take action

#### Okta

SSO user actions and application assignments

#### Postmark

We use Postmark to send emails to users using templates so our stakeholder teams can more easily edit and send tests of automatic emails while LCM handles the triggers for sending these out. You will need access to the `LifecycleManager` server within Postmark to see templates.

#### Slack

Uses the web client API to establish a connection using the Lifecycle Manager Slack App Credentials.

This module also handles error handling alerting into a Slack channel for IT digestion

#### Snipe

Handles hardware inventory actions. 

* User checkout of assigned devices
* Departing employees machine to "Expecting Return" on deactivation

#### Jotform

Looks up laptop shipping information and puts this info into the user db record.


### Contractors

Functions pertaining to contractor lifecycle action

### Onboarding

Functions pertaining to Onboarding actions

### Offboarding

Functions pertaining to Offboarding actions

### date_utils

A util module for use in all other modules that deal with dates and times

### db

Backend db code for connection and querying

## Frontend

uses `ejs` for easy templates in the `view` directory

