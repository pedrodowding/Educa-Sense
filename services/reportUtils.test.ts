
// import { describe, it, expect } from 'vitest'; 
import { calculateLast7DaysStatus, calculateWeeklyXPSeries, calculateSubjectStats, getWeeklySummary, ActivityCompletion } from './reportUtils';
import { Subject } from '../types';

// Simple test runner if vitest/jest not set up
const runTest = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✅ ${name} passed`);
    } catch (e) {
        console.error(`❌ ${name} failed:`, e);
        // Don't exit process so we can see all results
    }
};

const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
};

// 4. Audit: getWeeklySummary scenarios
runTest('getWeeklySummary: checkin only should yield active week and XP', () => {
    const today = new Date().toISOString().slice(0, 10);
    const completions: ActivityCompletion[] = [
        { completed_date: today, xp: 10, activity_type: 'daily_checkin', subject: 'Rotina' }
    ];
    const xpLogs: any[] = []; // No explicit gamification logs, rely on fallback

    const summary = getWeeklySummary(completions, xpLogs);

    assert(summary.total_activity_completions === 0, `Expected 0 activities, got ${summary.total_activity_completions}`);
    assert(summary.total_checkins === 1, `Expected 1 checkin, got ${summary.total_checkins}`);
    assert(summary.active_week === true, `Expected active week`);
    assert(summary.total_xp_week === 10, `Expected 10 XP (fallback), got ${summary.total_xp_week}`);
    // Dominant subject logic might filter out checkins depending on implementation, let's check
    // The implementation filters out checkins for subject counts?
    // "if (c.activity_type !== 'goal_check' && c.activity_type !== 'daily_checkin' && c.subject)"
    // So dominant subject should be null if only checkin.
    assert(summary.dominant_subject === null, `Expected null dominant subject for checkin only`);
});

runTest('getWeeklySummary: mixed activity should calculate correctly', () => {
    const today = new Date().toISOString().slice(0, 10);
    const completions: ActivityCompletion[] = [
        { completed_date: today, xp: 50, activity_type: 'exercise', subject: 'Matemática' },
        { completed_date: today, xp: 10, activity_type: 'daily_checkin' },
        { completed_date: today, xp: 10, activity_type: 'goal_check' }
    ];
    const xpLogs: any[] = []; 

    const summary = getWeeklySummary(completions, xpLogs);

    assert(summary.total_activity_completions === 1, `Expected 1 activity`);
    assert(summary.total_checkins === 1, `Expected 1 checkin`);
    assert(summary.total_goals_checked === 1, `Expected 1 goal`);
    assert(summary.total_xp_week === 70, `Expected 70 XP total, got ${summary.total_xp_week}`);
    assert(summary.dominant_subject === 'Matemática', `Expected Matemática`);
});

// 1. Audit: last7DaysStatus presence vs streak
runTest('last7DaysStatus: should count goal_check as presence but NOT streak', () => {
    const today = new Date().toISOString().slice(0, 10);
    const completions: ActivityCompletion[] = [
        { completed_date: today, xp: 10, activity_type: 'goal_check' }, 
        { completed_date: today, xp: 10, activity_type: 'goal_check' },
        { completed_date: today, xp: 10, activity_type: 'goal_check' },
        { completed_date: today, xp: 10, activity_type: 'goal_check' } 
    ];
    
    // Even with 4 goal_checks, streak should be false because activity_type is filtered out
    // Presence should be true
    
    const getDayLabel = () => 'Day';
    const result = calculateLast7DaysStatus(completions, today, getDayLabel);
    const todayResult = result.find(r => r.date === today);
    
    assert(todayResult !== undefined, 'Today should be in result');
    assert(todayResult?.done === false, `Streak should be FALSE for goal_checks only. Got ${todayResult?.done}`);
    assert(todayResult?.present === true, `Presence should be TRUE for goal_checks`);
});

// 2. Audit: weeklyXPSeries always returns 7 points
runTest('weeklyXPSeries: should always return 7 data points', () => {
    const result = calculateWeeklyXPSeries([], []);
    assert(result.length === 7, `Expected 7 points, got ${result.length}`);
});

// 3. Audit: subjectAverages corrections
runTest('subjectAverages: should handle pending grades correctly', () => {
    const mockHistory: any[] = [
        { subject: Subject.MATH, score: 10, totalQuestions: 5, completed: true },
        { subject: Subject.MATH, score: undefined, totalQuestions: 5, completed: true }, // Pending
        { subject: Subject.MATH, score: 0, totalQuestions: 5, completed: true } // Zero
    ];
    
    const stats = calculateSubjectStats(mockHistory);
    const mathStats = stats.subjects.find(s => s.name === Subject.MATH);
    
    console.log('[TEST VERIFY] Math Stats:', mathStats);
    
    // Total 3 items. Scored 2 (10 and 0). Pending 1.
    // Avg = (10+0)/2 = 5.
    
    assert(mathStats?.count === 3, `Expected 3 total items`);
    assert(mathStats?.scoredCount === 2, `Expected 2 scored items`);
    assert(mathStats?.pendingCount === 1, `Expected 1 pending item`);
    assert(mathStats?.avg === 5, `Expected avg 5, got ${mathStats?.avg}`);
});

runTest('subjectAverages: should return null avg if all pending', () => {
    const mockHistory: any[] = [
        { subject: Subject.SCIENCE, score: undefined, totalQuestions: 5, completed: true }
    ];
    const stats = calculateSubjectStats(mockHistory);
    const scienceStats = stats.subjects.find(s => s.name === Subject.SCIENCE);
    
    assert(scienceStats?.avg === null, `Expected null avg for pending only, got ${scienceStats?.avg}`);
});
