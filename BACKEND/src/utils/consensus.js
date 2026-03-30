/**
 * Consensus Algorithm - weighted tag matching
 *
 * 1. Compute group preference profile (mode of each field)
 * 2. Score each destination against the profile
 * 3. Return top 3 with explanation
 */

/**
 * Find the most common value in an array (mode)
 */
function mode(arr) {
    if (!arr || !arr.length) return null;
    const freq = {};
    let maxFreq = 0;
    let result = arr[0];
    for (const val of arr) {
        freq[val] = (freq[val] || 0) + 1;
        if (freq[val] > maxFreq) {
            maxFreq = freq[val];
            result = val;
        }
    }
    return result;
}

/**
 * Compute group preference profile from survey responses
 * Returns: { budget, vibe, pace }
 */
function computeGroupProfile(surveyResponses) {
    if (!surveyResponses.length) return null;
    return {
        budget: mode(surveyResponses.map(r => r.budget)),
        vibe: mode(surveyResponses.map(r => r.vibe)),
        pace: mode(surveyResponses.map(r => r.pace)),
    };
}

/**
 * Score a destination against the group profile
 * Returns: { score (0-3), matchedTags [] }
 */
function scoreDestination(destination, profile) {
    const matchedTags = [];
    let score = 0;

    if (destination.tags.budget === profile.budget) {
        score++;
        matchedTags.push(`budget:${profile.budget}`);
    }
    if (destination.tags.vibe === profile.vibe) {
        score++;
        matchedTags.push(`vibe:${profile.vibe}`);
    }
    if (destination.tags.pace === profile.pace) {
        score++;
        matchedTags.push(`pace:${profile.pace}`);
    }

    return { score, matchedTags };
}

/**
 * Generate top 3 destination recommendations
 * @param {Array} surveyResponses - array of SurveyResponse docs
 * @param {Array} destinations - array of Destination docs
 * @returns {{ profile, topDestinations: [{destination, score, matchedTags}] }}
 */
function generateRecommendations(surveyResponses, destinations) {
    const profile = computeGroupProfile(surveyResponses);
    if (!profile) return { profile: null, topDestinations: [] };

    const scored = destinations.map(dest => {
        const { score, matchedTags } = scoreDestination(dest, profile);
        return { destination: dest, score, matchedTags };
    });

    // Sort by score descending, then by name for stable sort
    scored.sort((a, b) => b.score - a.score || a.destination.name.localeCompare(b.destination.name));

    const topDestinations = scored.slice(0, 3);
    return { profile, topDestinations };
}

module.exports = { computeGroupProfile, scoreDestination, generateRecommendations };
