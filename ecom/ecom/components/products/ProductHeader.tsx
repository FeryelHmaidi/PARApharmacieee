import React from "react";

const ProductHeader: React.FC = () => {
  return (
    <header className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Boutique</h1>
        <p className="text-gray-500 mt-2">
          Trouvez vos produits favoris — filtrez, recherchez, achetez.
        </p>
      </div>
    </header>
  );
};

export default ProductHeader;
