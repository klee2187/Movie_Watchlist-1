const routes = require('express').Router();
const userController = require('../controllers/users');
const { userValidationRules } = require('../middleware/validation');
const { isAuthenticated } = require('../middleware/auth');

// GET all users (Protected)
routes.get('/', isAuthenticated, userController.getAllUsers);
 
// GET a single user by ID
routes.get(
  '/:id',
  isAuthenticated,
  userValidationRules.getById,
  userController.getUserById,
);
 
// POST to create a new user
routes.post(
  '/',
  isAuthenticated,
  userValidationRules.create,
  userController.createUser,
);
 
// PUT to update a user
routes.put(
  '/:id',
  isAuthenticated,
  userValidationRules.update,
  userController.updateUser,
);
 
// DELETE to delete a user
routes.delete(
  '/:id',
  isAuthenticated,
  userValidationRules.delete,
  userController.deleteUser,
);
 
module.exports = routes;