import Header from "./pageComponents/Header";
import Showcase from "./pageComponents/Showcase";
import Footer from "./pageComponents/Footer";

function Landing() {
    return(
        <div className="page">
            <>
                <Header/>
                <Showcase/>
                <Footer/>
            </>
        </div>
    );
}

export default Landing