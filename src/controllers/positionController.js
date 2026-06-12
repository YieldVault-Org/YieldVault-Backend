'use strict';

const positionService = require('../services/positionService');

/**
 * Position controller: deposit, withdraw and position queries.
 */
function deposit(req, res) {
  const { user, vaultId, amount } = req.body;
  const result = positionService.deposit({ user, vaultId, amount });
  res.status(201).json(result);
}

function withdraw(req, res) {
  const { user, vaultId, shares } = req.body;
  const result = positionService.withdraw({ user, vaultId, shares });
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

module.exports = {
  deposit,
  withdraw,
  listPositions,
  getPosition,
};
