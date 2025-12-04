import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { externalService } from '@/services/external'
import { PokemonListItem, PokemonDetail } from '@/types'

function PokemonCard({ pokemon, onClick }: { pokemon: PokemonListItem; onClick: () => void }) {
  const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
      data-testid={`pokemon-card-${pokemon.id}`}
    >
      <CardContent className="p-4 flex flex-col items-center">
        <img 
          src={imageUrl} 
          alt={pokemon.name}
          className="w-24 h-24 object-contain"
          loading="lazy"
        />
        <p className="mt-2 text-sm font-medium capitalize">{pokemon.name}</p>
        <p className="text-xs text-muted-foreground">#{pokemon.id}</p>
      </CardContent>
    </Card>
  )
}

function PokemonDetailView({ pokemon, onBack }: { pokemon: PokemonDetail; onBack: () => void }) {
  const imageUrl = pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default
  
  const typeColors: Record<string, string> = {
    normal: 'bg-gray-400',
    fire: 'bg-red-500',
    water: 'bg-blue-500',
    electric: 'bg-yellow-400',
    grass: 'bg-green-500',
    ice: 'bg-cyan-300',
    fighting: 'bg-orange-700',
    poison: 'bg-purple-500',
    ground: 'bg-amber-600',
    flying: 'bg-indigo-300',
    psychic: 'bg-pink-500',
    bug: 'bg-lime-500',
    rock: 'bg-stone-500',
    ghost: 'bg-purple-700',
    dragon: 'bg-violet-600',
    dark: 'bg-gray-700',
    steel: 'bg-slate-400',
    fairy: 'bg-pink-300',
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para lista
      </Button>
      
      <Card data-testid="pokemon-detail">
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <span className="capitalize text-2xl">{pokemon.name}</span>
            <span className="text-muted-foreground">#{pokemon.id}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex justify-center">
              <img 
                src={imageUrl} 
                alt={pokemon.name}
                className="w-64 h-64 object-contain"
              />
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Tipos</h3>
                <div className="flex gap-2">
                  {pokemon.types.map((t) => (
                    <span 
                      key={t.type.name}
                      className={`px-3 py-1 rounded-full text-white text-sm capitalize ${typeColors[t.type.name] || 'bg-gray-500'}`}
                    >
                      {t.type.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Altura</h3>
                  <p>{(pokemon.height / 10).toFixed(1)} m</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Peso</h3>
                  <p>{(pokemon.weight / 10).toFixed(1)} kg</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Habilidades</h3>
                <div className="flex flex-wrap gap-2">
                  {pokemon.abilities.map((a) => (
                    <span 
                      key={a.ability.name}
                      className={`px-2 py-1 rounded text-sm capitalize ${a.is_hidden ? 'bg-muted text-muted-foreground' : 'bg-primary/10'}`}
                    >
                      {a.ability.name.replace('-', ' ')}
                      {a.is_hidden && ' (oculta)'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="font-semibold mb-4">Estatísticas Base</h3>
            <div className="space-y-3">
              {pokemon.stats.map((stat) => (
                <div key={stat.stat.name} className="flex items-center gap-4">
                  <span className="w-32 text-sm capitalize">{stat.stat.name.replace('-', ' ')}</span>
                  <div className="flex-1 bg-muted rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (stat.base_stat / 255) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-sm text-right">{stat.base_stat}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


export function Explore() {
  const [items, setItems] = useState<PokemonListItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  
  const limit = 20

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await externalService.getItems(page, limit)
      setItems(response.data)
      setTotalPages(response.totalPages)
      setTotal(response.total)
    } catch (err) {
      setError('Falha ao carregar dados. Tente novamente.')
      console.error('Error fetching items:', err)
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handlePokemonClick = async (pokemon: PokemonListItem) => {
    setIsLoadingDetail(true)
    try {
      const detail = await externalService.getItemDetail(pokemon.id)
      setSelectedPokemon(detail)
    } catch (err) {
      setError('Falha ao carregar detalhes. Tente novamente.')
      console.error('Error fetching pokemon detail:', err)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleBack = () => {
    setSelectedPokemon(null)
  }

  if (selectedPokemon) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Explorar</h1>
          <p className="text-muted-foreground">Detalhes do Pokémon</p>
        </div>
        <PokemonDetailView pokemon={selectedPokemon} onBack={handleBack} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Explorar</h1>
        <p className="text-muted-foreground">
          Explore dados da PokéAPI - {total} Pokémon disponíveis
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md" data-testid="error-message">
          {error}
        </div>
      )}

      {isLoading || isLoadingDetail ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="pokemon-grid">
            {items.map((pokemon) => (
              <PokemonCard 
                key={pokemon.id} 
                pokemon={pokemon} 
                onClick={() => handlePokemonClick(pokemon)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="prev-page-btn"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                data-testid="next-page-btn"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
