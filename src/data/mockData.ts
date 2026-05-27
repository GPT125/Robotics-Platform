import type { EventSummary, Match, RobotProject, ScoutingNote, Team } from '../types';

export const currentEvent: EventSummary = {
  id: 'v5rc-la-qualifier',
  name: 'Los Angeles V5RC Qualifier',
  location: 'Pasadena, CA',
  date: 'May 30, 2026',
  status: 'Fresh',
  teamCount: 46,
  division: 'Technology',
};

export const teams: Team[] = [
  {
    number: '8059A',
    name: 'Blank Robotics',
    organization: 'Northview High',
    region: 'CA',
    winRate: 0.74,
    avgScore: 86,
    maxScore: 132,
    consistency: 91,
    autonSignal: 83,
    skills: 214,
    risk: 12,
    tags: ['fast auton', 'consistent driver', 'good partner'],
    confidence: 'High confidence',
  },
  {
    number: '315R',
    name: 'Circuit Breakers',
    organization: 'STEM Academy',
    region: 'CA',
    winRate: 0.66,
    avgScore: 79,
    maxScore: 119,
    consistency: 78,
    autonSignal: 91,
    skills: 229,
    risk: 20,
    tags: ['high programming skills', 'risky intake'],
    confidence: 'Medium confidence',
  },
  {
    number: '24K',
    name: 'Keystone',
    organization: 'Valley Robotics',
    region: 'NV',
    winRate: 0.61,
    avgScore: 73,
    maxScore: 108,
    consistency: 84,
    autonSignal: 76,
    skills: 188,
    risk: 8,
    tags: ['defensive', 'mechanically reliable'],
    confidence: 'High confidence',
  },
  {
    number: '1010X',
    name: 'XLR8',
    organization: 'Mesa Robotics',
    region: 'AZ',
    winRate: 0.58,
    avgScore: 69,
    maxScore: 104,
    consistency: 70,
    autonSignal: 68,
    skills: 171,
    risk: 28,
    tags: ['high ceiling', 'limited data'],
    confidence: 'Low data',
  },
];

export const matches: Match[] = [
  {
    id: 'q24',
    number: 'Q24',
    field: 'Field 2',
    startsAt: '3:42 PM',
    red: ['8059A', '24K'],
    blue: ['315R', '1010X'],
    prediction: {
      winner: 'red',
      probability: 0.62,
      confidence: 'Medium confidence',
      reasons: ['Higher consistency', 'Lower disable risk', 'Better driver-control average'],
    },
  },
  {
    id: 'q25',
    number: 'Q25',
    field: 'Field 1',
    startsAt: '3:51 PM',
    red: ['315R', '8059A'],
    blue: ['24K', '1010X'],
    redScore: 102,
    blueScore: 88,
    prediction: {
      winner: 'red',
      probability: 0.67,
      confidence: 'High confidence',
      reasons: ['Strong auton pairing', 'Skills advantage', 'Scout notes agree'],
    },
  },
  {
    id: 'q26',
    number: 'Q26',
    field: 'Field 3',
    startsAt: '4:03 PM',
    red: ['1010X', '24K'],
    blue: ['8059A', '315R'],
    prediction: {
      winner: 'blue',
      probability: 0.71,
      confidence: 'Medium confidence',
      reasons: ['Programming skills gap', 'Complementary scoring roles', 'Recent form'],
    },
  },
];

export const notes: ScoutingNote[] = [
  {
    id: 'n1',
    team: '8059A',
    match: 'Q18',
    type: 'match',
    tags: ['strong auton', 'clean driver'],
    values: { autonSuccess: true, scoredObjects: 18, defense: false },
    syncState: 'synced',
    updatedAt: '2:14 PM',
  },
  {
    id: 'n2',
    team: '315R',
    match: 'Pit',
    type: 'pit',
    tags: ['intake repair', 'programming skills'],
    values: { drivetrain: '6 motor tank', lift: 'arm', reliability: 'medium' },
    syncState: 'local_only',
    updatedAt: '3:02 PM',
  },
  {
    id: 'n3',
    team: '1010X',
    match: 'Q22',
    type: 'match',
    tags: ['tipped', 'fast recovery'],
    values: { autonSuccess: false, scoredObjects: 12, defense: true },
    syncState: 'failed',
    updatedAt: '3:19 PM',
  },
];

export const robotProjects: RobotProject[] = [
  {
    id: 'competition-bot',
    name: 'Competition Bot',
    season: 'V5RC 2026',
    status: 'Ready to simulate',
    dimensions: {
      length: 17.8,
      width: 17.4,
      height: 15.6,
      wheelDiameter: 4,
      trackWidth: 12.4,
      wheelbase: 11.8,
      gearRatio: '1:1',
      mass: 18.2,
      friction: 0.82,
      calibrationScore: 'High confidence',
    },
  },
  {
    id: 'skills-bot',
    name: 'Skills Bot',
    season: 'V5RC 2026',
    status: 'Needs calibration',
    dimensions: {
      length: 17,
      width: 17,
      height: 14,
      wheelDiameter: 3.25,
      trackWidth: 11.6,
      wheelbase: 11.2,
      gearRatio: '3:5',
      mass: 16.4,
      friction: 0.72,
      calibrationScore: 'Low data',
    },
  },
];

export const sampleCode = `#include "vex.h"
using namespace vex;

void autonomousRoute_A() {
  Drivetrain.setDriveVelocity(55, percent);
  Drivetrain.driveFor(forward, 24, inches);
  Drivetrain.turnFor(right, 38, degrees);
  Drivetrain.driveFor(forward, 18, inches);
  ArmMotor.spinFor(forward, 220, degrees);
}`;
