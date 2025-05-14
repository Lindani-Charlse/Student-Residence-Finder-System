import { Typography } from '@mui/material';
import MaintenanceReport from './pageComponents/MaintenanceReport';
import Footer from './pageComponents/Footer';
import Header from './pageComponents/Header';

const MaintenancePage = () => {
  return (
    <>
    <Header />
      <Typography variant="h4" gutterBottom>
        Maintenance Reporting
      </Typography>
      <MaintenanceReport />
      <Footer />
    </>
  );
};

export default MaintenancePage;

 