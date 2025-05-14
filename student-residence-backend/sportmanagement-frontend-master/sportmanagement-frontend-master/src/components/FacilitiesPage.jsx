 
import { Typography } from '@mui/material';
import FacilityCalendar from './pageComponents/FacilityCalendar';

const FacilitiesPage = () => {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Facility Booking
      </Typography>
      <FacilityCalendar />
    </>
  );
};

export default FacilitiesPage;