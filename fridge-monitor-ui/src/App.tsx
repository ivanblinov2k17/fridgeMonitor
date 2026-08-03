import TemperatureChart from './components/TemperatureChart';
import { useTemperature } from './hooks/useTemperature';

function App() {
  const temperatures = useTemperature();
  return (
    <div>
      <h1>Fridge Monitor</h1>
      {Object.entries(temperatures).map(([id, data]) => (
        <TemperatureChart 
          key={id} 
          title={`Fridge ${id}`} 
          data={data} 
        />
      ))}
    </div>
  );
}

export default App;
