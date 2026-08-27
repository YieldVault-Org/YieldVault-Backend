'use strict';

const positionService = require('../services/positionService');
const { validateResponse } = require('../services/contractValidationService');

/**
 * Position controller: deposit, withdraw and position queries.
 */
function deposit(req, res) {
  const { user, vaultId, amount } = req.body;
  const result = positionService.deposit({ user, vaultId, amount });
  validateResponse('depositSuccess', result);
  res.status(201).json(result);
}

function withdraw(req, res) {
  const { user, vaultId, shares } = req.body;
  const result = positionService.withdraw({ user, vaultId, shares });
  validateResponse('withdrawSuccess', result);
  res.json(result);
}

function listPositions(req, res) {
  const positions = positionService.listPositions(req.query.user);
  const response = { count: positions.length, positions };
  validateResponse('positionList', response);
  res.json(response);
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
