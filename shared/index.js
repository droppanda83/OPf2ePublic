"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDistance = calculateDistance;
exports.isCreatureAlive = isCreatureAlive;
exports.formatHealth = formatHealth;
exports.getCreatureStatus = getCreatureStatus;
exports.getColor = getColor;
exports.rollDice = rollDice;
exports.rollD20 = rollD20;
exports.sumDice = sumDice;
// Export all shared types
__exportStar(require("./types"), exports);
// Utility functions
function calculateDistance(from, to) {
    return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}
function isCreatureAlive(creature) {
    return creature.currentHealth > 0;
}
function formatHealth(current, max) {
    return `${current}/${max} HP`;
}
function getCreatureStatus(creature) {
    if (!isCreatureAlive(creature)) {
        return 'Defeated';
    }
    const healthPercent = (creature.currentHealth / creature.maxHealth) * 100;
    if (healthPercent > 75)
        return 'Healthy';
    if (healthPercent > 50)
        return 'Injured';
    if (healthPercent > 25)
        return 'Badly Wounded';
    return 'Critical';
}
function getColor(status) {
    switch (status) {
        case 'Healthy': return '#4CAF50';
        case 'Injured': return '#FFC107';
        case 'Badly Wounded': return '#FF9800';
        case 'Critical': return '#F44336';
        case 'Defeated': return '#9E9E9E';
        default: return '#2196F3';
    }
}
// Dice rolling utility
function rollDice(times, sides) {
    const results = [];
    for (let i = 0; i < times; i++) {
        results.push(Math.floor(Math.random() * sides) + 1);
    }
    return results;
}
function rollD20() {
    return rollDice(1, 20)[0];
}
function sumDice(rolls) {
    return rolls.reduce((a, b) => a + b, 0);
}
