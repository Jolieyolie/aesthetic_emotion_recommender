import ImageSelectionGrid from "./components/ImageSelectionGrid";

function App() {
  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-600">
        Please select the images you like
      </h1>
      <ImageSelectionGrid />
    </main>
  );
}

export default App;
