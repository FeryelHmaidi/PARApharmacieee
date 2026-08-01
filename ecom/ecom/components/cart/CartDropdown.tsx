"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCartStore, selectCartTotals } from "@/hooks/useCartStore";
import { useMemo } from "react";

const CartDropdown = () => {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = useMemo(() => selectCartTotals(items), [items]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative gap-2">
          <ShoppingCart size={20} />
          <span className="hidden sm:inline">Panier</span>
          {totals.itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-yellow-600 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1">
              {totals.itemCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Votre Panier</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500">
            Aucun article pour le moment.
          </div>
        )}
        {items.length > 0 && (
          <div className="max-h-[320px] overflow-auto divide-y">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="p-3 focus:bg-transparent"
              >
                <div className="flex gap-3 w-full items-center">
                  <div className="w-12 h-12 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 relative">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                        🛍️
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight line-clamp-2">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.sizeLabel} · {item.unitPrice.toFixed(2).replace('.', ',')} Dt
                    </p>
                    <p className="text-xs text-gray-500">
                      Qté: {item.quantity}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="text-gray-400 hover:text-red-600"
                    aria-label="Supprimer l'article"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Sous-total</span>
            <span className="font-semibold">
              {totals.subtotal.toFixed(2).replace('.', ',')} Dt
            </span>
          </div>
          <Button
            asChild
            className="w-full bg-yellow-600 text-white hover:bg-yellow-700"
            disabled={items.length === 0}
          >
            <Link href="/cart">Voir le panier</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CartDropdown;
