import NUNSALogo from "@/assets/Ielcom-logo.png"; 


const footerr = () => {


    return (
<footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-3 mb-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                    src={NUNSALogo}
                    alt="NUNSA Logo Placeholder" 
                    className="w-auto h-16 sm:h-20 lg:h-30 object-contain rounded-full" 
                    />
              </div>
              <span className="text-xl font-bold">NUNSA Electoral System</span>
            </div>
            
            <p className="text-gray-400 mb-6">
              Faculty of Nursing Sciences, Al-Hikmah University, Ilorin
            </p>
          <p className="text-center text-sm text-muted-foreground">
            © 2025 NUNSA Electoral System. All rights reserved.</p>
          </div>
        </div>
      </footer>
     );
};

export default footerr;