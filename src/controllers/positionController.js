'use strict';

const positionService = require('../services/positionService');

/**
 * Position controller: deposit, withdraw and position queries.
 */
function deposit(req, res) {
  const { user, vaultId, amount, idempotencyKey } = req.body;
  const result = positionService.deposit({ user, vaultId, amount, idempotencyKey, correlationId: req.id });
  res.status(201).json(result);
}

function withdraw(req, res) {
  const { user, vaultId, shares, idempotencyKey } = req.body;
  const result = positionService.withdraw({ user, vaultId, shares, idempotencyKey, correlationId: req.id });
  res.json(result);
}

function listPositions(req, res) {
  const positions = positionService.listPositions(req.query.user);
  res.json({ count: positions.length, positions });
}

function getPosition(req, res) {
  const position = positionService.getPosition(req.params.id);
  res.json({ position });
}

function getSummary(req, res) {
  const summary = positionService.getUserSummary(req.query.user);
  res.json({ summary });
}

module.exports = {
  deposit,
  withdraw,
  listPositions,
  getSummary,
  getPosition,
};
