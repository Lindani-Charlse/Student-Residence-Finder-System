import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Select, InputLabel, FormControl, IconButton, Snackbar, Alert,
  CircularProgress, Typography, Container, Box, Grid
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import Header from './pageComponents/Header';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8080/api/v1/user';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'member', status: 'active' });
  const [validationErrors, setValidationErrors] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData?.role === 'admin') {
      setIsAdmin(true);
      fetchUsers();
    } else {
      setIsAdmin(false);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/all`);
      setUsers(response.data);
    } catch (error) {
      showSnackbar('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (user) => {
    const errors = {};
    if (!user.name.trim()) errors.name = 'Name is required';
    if (!user.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.email = 'Email is invalid';
    }
    if (!user.role) errors.role = 'Role is required';
    return errors;
  };

  const startEvent = () => {
    if (!isAdmin) return showSnackbar('Only admins can access event management', 'error');
    navigate('/events-management');
  };

  const handleInputChange = ({ target: { name, value } }) => {
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = ({ target: { name, value } }) => {
    setCurrentUser(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async () => {
    if (!isAdmin) return showSnackbar('Only admins can add users', 'error');

    const errors = validateForm(newUser);
    if (Object.keys(errors).length) return setValidationErrors(errors);

    try {
      await axios.post(`${API_BASE_URL}/register`, newUser);
      showSnackbar('User added successfully', 'success');
      setNewUser({ name: '', email: '', role: 'member', status: 'active' });
      setOpenAddDialog(false);
      fetchUsers();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to add user', 'error');
    }
  };

  const handleEditUser = (user) => {
    if (!isAdmin) return showSnackbar('Only admins can edit users', 'error');
    setCurrentUser({ ...user });
    setValidationErrors({});
    setOpenEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!isAdmin) return showSnackbar('Only admins can update users', 'error');

    const errors = validateForm(currentUser);
    if (Object.keys(errors).length) return setValidationErrors(errors);

    try {
      await axios.put(`${API_BASE_URL}`, currentUser);
      setOpenEditDialog(false);
      showSnackbar('User updated successfully', 'success');
      fetchUsers();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!isAdmin) return showSnackbar('Only admins can delete users', 'error');
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      showSnackbar('User deleted successfully', 'success');
      fetchUsers();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseDialog = () => {
    setOpenEditDialog(false);
    setOpenAddDialog(false);
    setValidationErrors({});
  };

  if (!isAdmin) {
    return (
      <>
        <Header />
        <Container maxWidth="lg">
          <Box mt={5} textAlign="center">
            <Typography variant="h4" color="error">Access Denied</Typography>
            <Typography variant="body1">You must be an administrator to access this page.</Typography>
          </Box>
        </Container>
      </>
    );
  }

  return (
   <>
      <Header />
    <Container maxWidth="lg">
    
      <Typography variant="h4" gutterBottom style={{ margin: '20px 0', color: '#1976d2', textAlign: 'center' }}>
        User Management
      </Typography>

      <Box display="flex" justifyContent="space-between" mb={2}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => setOpenAddDialog(true)}
          disabled={!isAdmin}
        >
          Add User
        </Button>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={startEvent}
        >
          Event Manager
        </Button>
      </Box>

      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead style={{ backgroundColor: '#1976d2' }}>
              <TableRow>
                <TableCell style={{ color: 'white' }}>ID</TableCell>
                <TableCell style={{ color: 'white' }}>Name</TableCell>
                <TableCell style={{ color: 'white' }}>Email</TableCell>
                <TableCell style={{ color: 'white' }}>Role</TableCell>
                <TableCell style={{ color: 'white' }}>Status</TableCell>
                <TableCell style={{ color: 'white' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.userid} hover>
                    <TableCell>{user.userid}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>
                      <IconButton 
                        color="primary" 
                        onClick={() => handleEditUser(user)}
                        aria-label="edit"
                        disabled={!isAdmin}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteUser(user.userid)}
                        aria-label="delete"
                        disabled={!isAdmin}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: '5px' }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={newUser.name}
                onChange={handleInputChange}
                error={!!validationErrors.name}
                helperText={validationErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={newUser.email}
                onChange={handleInputChange}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!validationErrors.role}>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  label="Role"
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="Facility_staff">Facility staff</MenuItem>
                  <MenuItem value="resident">Resident</MenuItem>
                </Select>
                {validationErrors.role && (
                  <Typography variant="caption" color="error">
                    {validationErrors.role}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={newUser.status}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddUser} color="primary" variant="contained">
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} style={{ marginTop: '5px' }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={currentUser?.name || ''}
                onChange={handleEditInputChange}
                error={!!validationErrors.name}
                helperText={validationErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={currentUser?.email || ''}
                onChange={handleEditInputChange}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!validationErrors.role}>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={currentUser?.role || ''}
                  onChange={handleEditInputChange}
                  label="Role"
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="Facility_staff">Facility staff</MenuItem>
                  <MenuItem value="resident">Resident</MenuItem>
                </Select>
                {validationErrors.role && (
                  <Typography variant="caption" color="error">
                    {validationErrors.role}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={currentUser?.status || ''}
                  onChange={handleEditInputChange}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleUpdateUser} color="primary" variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
    </>
  );

}

export default UserManagement;