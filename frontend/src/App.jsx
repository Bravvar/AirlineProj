function App() {
    return (
        <div className="flex justify-center items-center h-screen text-white">
            <div className="w-max">
                {/* Navigation Bar */}
                <div className="flex flex-row justify-evenly w-full top-0 bg-gray-700 space-x-5 p-2 rounded-t-lg">
                    <div>Flights</div>
                    <div>Vacations</div>
                    <div>Hotels</div>
                    <div>Cars</div>
                    <div>Cruises</div>
                </div>

                {/* Depart and Arrive Search Bar */}
                <div className="flex flex-row w-full bg-blue-500 p-4">
                    <div className="flex flex-col gap-1 items-baseline">
                        <label htmlFor="depart">*Depart</label>
                        <input 
                            type="text" 
                            name="depart" 
                            id="depart" 
                            className="p-2 outline-none bg-white text-black m-2" 
                        />
                    </div>
                    <div className="flex flex-col gap-1 items-baseline">
                        <label htmlFor="arrive">*Arrive</label>
                        <input 
                            type="text" 
                            name="arrive" 
                            id="arrive" 
                            className="p-2 outline-none bg-white text-black m-2" 
                        />
                    </div>
                </div>

                {/* Set date for depart and arrive */}
                <div className="flex fles-row w-full bg-blue-500 p-4">
                    <div className="flex flex-col gap-1 items-baseline">
                        <label htmlFor="departDate">*Depart Date:</label>
                        <input 
                            type="text" 
                            name="departDate" 
                            id="departDate" 
                            className="outline-none bg-white text-black m-2" 
                        />                            
                    </div>
                    <div className="flex flex-col gap-1 items-baseline">
                        <label htmlFor="returnDate">*Return Date:</label>
                        <input 
                            type="text" 
                            name="returnDate" 
                            id="returnDate" 
                            className="outline-none bg-white text-black m-2" 
                        />                            
                    </div>                    
                </div>

                {/* Search Submit */}
                <div className="p-5 bg-blue-500 flex justify-center rounded-b-lg">
                    <button className="bg-gray-700 px-4 py-2 rounded-lg text-white font-medium hover:bg-gray-800">
                        Search flight
                    </button>
                </div> 
            </div>
        </div>
    );
}

export default App;
