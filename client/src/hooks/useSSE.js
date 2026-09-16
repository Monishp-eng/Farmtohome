import { useState, useEffect } from 'react';
import { priceStream } from '../utils/sse';

export const useMarketPriceStream = () => {
  const [prices, setPrices] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    setIsLive(true);
    const unsubscribe = priceStream.subscribe((data) => {
      setPrices(data);
    });

    return () => {
      unsubscribe();
      setIsLive(false);
    };
  }, []);

  return { prices, isLive };
};

export default useMarketPriceStream;
