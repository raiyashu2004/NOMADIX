/**
 * Consensus Algorithm - mathematical tuning with individual scoring
 */

function scoreBudget(userBudget, destBudget) {
    if (userBudget === destBudget) return 1;
    const map = { 'budget': 0, 'moderate': 1, 'luxury': 2 };
    if (Math.abs(map[userBudget] - map[destBudget]) === 1) return 0.5;
    return 0;
}

function scorePace(userPace, destPace) {
    if (userPace === destPace) return 1;
    const map = { 'slow': 0, 'moderate': 1, 'fast': 2 };
    if (Math.abs(map[userPace] - map[destPace]) === 1) return 0.5;
    return 0;
}

function scoreVibe(userVibe, destVibe) {
    if (userVibe === destVibe) return 1.5; // Vibe weighted slightly higher
    
    // Partial vibe matches mapping
    const partials = {
        'nature': ['adventure', 'relaxation'],
        'adventure': ['nature'],
        'relaxation': ['nature'],
        'city': ['cultural', 'party'],
        'cultural': ['city'],
        'party': ['city']
    };

    if (partials[userVibe] && partials[userVibe].includes(destVibe)) {
        return 0.5;
    }
    return 0;
}

/**
 * Score a destination against all group survey responses
 * Returns: { score (total across all users), matchedTags [] }
 */
function scoreDestination(destination, surveyResponses) {
    let totalScore = 0;
    const matchedTagsSet = new Set();

    surveyResponses.forEach(response => {
        const bScore = scoreBudget(response.budget, destination.tags.budget);
        if (bScore === 1) matchedTagsSet.add(`budget:${destination.tags.budget}`);

        const pScore = scorePace(response.pace, destination.tags.pace);
        if (pScore === 1) matchedTagsSet.add(`pace:${destination.tags.pace}`);

        const vScore = scoreVibe(response.vibe, destination.tags.vibe);
        if (vScore === 1.5) matchedTagsSet.add(`vibe:${destination.tags.vibe}`);

        totalScore += bScore + pScore + vScore;
    });

    return { 
        score: totalScore, 
        matchedTags: Array.from(matchedTagsSet) 
    };
}

/**
 * Generate top 3 destination recommendations based on individual preferences
 */
function generateRecommendations(surveyResponses, destinations) {
    if (!surveyResponses || !surveyResponses.length) return { topDestinations: [] };

    const scored = destinations.map(dest => {
        const { score, matchedTags } = scoreDestination(dest, surveyResponses);
        return { destination: dest, score, matchedTags };
    });

    // Sort by score descending, then by name for tie-breaking
    scored.sort((a, b) => b.score - a.score || a.destination.name.localeCompare(b.destination.name));

    const topDestinations = scored.slice(0, 3);
    return { topDestinations };
}

// Export dummy computeGroupProfile in case anything was relying on it (though grep showed otherwise)
const computeGroupProfile = () => null;

module.exports = { computeGroupProfile, scoreDestination, generateRecommendations };
