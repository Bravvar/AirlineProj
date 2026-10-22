export default function SignInModal({ show, onHide }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Modal Box - Increased rounding */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] p-8 relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button onClick={onHide} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-3xl leading-none transition-colors">&times;</button>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Welcome Back</h3>
        
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          
          {/* Username Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl pl-11 pr-4 py-3.5 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400" 
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-2xl pl-11 pr-4 py-3.5 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400" 
            />
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex justify-between items-center mt-2 px-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 font-medium">
              <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
              Remember me
            </label>
            <a href="#" className="text-sm text-blue-600 font-semibold hover:underline">Forgot Password?</a>
          </div>

          {/* Login Button */}
          <button className="w-full bg-[#0066ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl mt-4 transition-all shadow-md hover:shadow-lg">
            Log In
          </button>
        </form>

        {/* Create Account Link */}
        <p className="text-center text-sm text-gray-600 mt-6 font-medium">
          Don't have an account? <a href="#" className="text-blue-600 hover:underline">Sign up</a>
        </p>
        
      </div>
    </div>
  );
}