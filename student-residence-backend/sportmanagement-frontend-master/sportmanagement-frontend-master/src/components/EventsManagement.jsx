import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
  Chip
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';

const API_BASE_URL = 'http://localhost:8080/api/v1/events';

function EventsManagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventType: 'TOURNAMENT',
    startDate: '',
    endDate: '',
    location: '',
    status: 'UPCOMING'
  });
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData?.role === 'admin') {
      setIsAdmin(true);
      fetchEvents();
    }
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_BASE_URL);
      setEvents(response.data);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch events';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const validateEvent = (event) => {
    const newErrors = {};
    if (!event.title.trim()) newErrors.title = 'Title is required';
    if (event.title.trim().length > 100) newErrors.title = 'Title must be less than 100 characters';
    if (!event.description.trim()) newErrors.description = 'Description is required';
    if (event.description.trim().length > 500) newErrors.description = 'Description must be less than 500 characters';
    if (!event.eventType) newErrors.eventType = 'Event type is required';
    if (!event.startDate) newErrors.startDate = 'Start date is required';
    if (!event.endDate) newErrors.endDate = 'End date is required';
    if (event.startDate && event.endDate && new Date(event.endDate) < new Date(event.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (currentEvent) {
      setCurrentEvent((prev) => ({ ...prev, [name]: value }));
    } else {
      setNewEvent((prev) => ({ ...prev, [name]: value }));
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const handleSubmit = async () => {
    const eventToValidate = currentEvent || newEvent;
    const validationErrors = validateEvent(eventToValidate);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const eventData = {
      title: eventToValidate.title,
      description: eventToValidate.description,
      eventType: eventToValidate.eventType,
      startDate: eventToValidate.startDate,
      endDate: eventToValidate.endDate,
      location: eventToValidate.location,
      status: eventToValidate.status
    };

    try {
      if (currentEvent) {
        await axios.put(`${API_BASE_URL}/${currentEvent.id}`, eventData);
        setSnackbar({ open: true, message: 'Event updated successfully', severity: 'success' });
      } else {
        await axios.post(API_BASE_URL, eventData);
        setSnackbar({ open: true, message: 'Event created successfully', severity: 'success' });
        setNewEvent({
          title: '',
          description: '',
          eventType: 'TOURNAMENT',
          startDate: '',
          endDate: '',
          location: '',
          status: 'UPCOMING'
        });
      }
      fetchEvents();
      setOpenDialog(false);
    } catch (error) {
      const message = error.response?.data?.message || 'Error during event submission';
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axios.delete(`${API_BASE_URL}/${id}`);
        setSnackbar({ open: true, message: 'Event deleted successfully', severity: 'success' });
        fetchEvents();
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to delete event';
        setSnackbar({ open: true, message, severity: 'error' });
      }
    }
  };

  const handleOpenEdit = (event) => {
    setCurrentEvent({
      ...event,
      startDate: formatDateForInput(event.startDate),
      endDate: formatDateForInput(event.endDate)
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenCreate = () => {
    setCurrentEvent(null);
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setErrors({});
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" color="error" align="center" mt={5}>
          Access Denied: Only admins can manage events
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Event Management
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={handleOpenCreate}
        sx={{ mb: 2 }}
      >
        Create New Event
      </Button>
      
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No events available
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.title}</TableCell>
                    <TableCell>
                      <Chip label={event.eventType} color="primary" />
                    </TableCell>
                    <TableCell>
                      {new Date(event.startDate).toLocaleString()} - {new Date(event.endDate).toLocaleString()}
                    </TableCell>
                    <TableCell>{event.location || 'Online'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={event.status} 
                        color={
                          event.status === 'UPCOMING' ? 'warning' : 
                          event.status === 'ONGOING' ? 'primary' : 'success'
                        } 
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenEdit(event)} aria-label="edit">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(event.id)} aria-label="delete">
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

      {/* Event Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>{currentEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                fullWidth
                name="title"
                value={currentEvent?.title || newEvent.title}
                onChange={handleInputChange}
                error={!!errors.title}
                helperText={errors.title}
                inputProps={{ maxLength: 100 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={4}
                name="description"
                value={currentEvent?.description || newEvent.description}
                onChange={handleInputChange}
                error={!!errors.description}
                helperText={errors.description}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.eventType}>
                <InputLabel>Event Type</InputLabel>
                <Select
                  name="eventType"
                  value={currentEvent?.eventType || newEvent.eventType}
                  onChange={handleInputChange}
                  label="Event Type"
                >
                  <MenuItem value="TOURNAMENT">Tournament</MenuItem>
                  <MenuItem value="MEETING">Meeting</MenuItem>
                  <MenuItem value="WORKSHOP">Workshop</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.status}>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={currentEvent?.status || newEvent.status}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="UPCOMING">Upcoming</MenuItem>
                  <MenuItem value="ONGOING">Ongoing</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Start Date & Time"
                type="datetime-local"
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                name="startDate"
                value={currentEvent?.startDate || newEvent.startDate}
                onChange={handleInputChange}
                error={!!errors.startDate}
                helperText={errors.startDate}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="End Date & Time"
                type="datetime-local"
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                name="endDate"
                value={currentEvent?.endDate || newEvent.endDate}
                onChange={handleInputChange}
                error={!!errors.endDate}
                helperText={errors.endDate}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Location"
                fullWidth
                name="location"
                value={currentEvent?.location || newEvent.location}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {currentEvent ? 'Save Changes' : 'Create Event'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default EventsManagement;