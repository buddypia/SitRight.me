# Error Handling Conventions (By Layer)

> Reference material moved from `SKILL.md` (R-CM-019 4.2 Tier separation).
> `SKILL.md` retains only the execution contract; read this file on-demand.

## Error Handling Conventions (Recap)

### API Layer

```typescript
/** Data Fetching */
async function fetchData(id: string): Promise<DataModel | null> {
  try {
    const response = await fetch(`/api/data/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as DataModel;
  } catch (error) {
    logger.error('fetchData', `Error fetching data: ${error}`);
    return null;
  }
}
```

### Custom Hook Layer

```typescript
/** Data Fetching Hook */
function useData(id: string) {
  const [data, setData] = useState<DataModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await fetchData(id);
        if (result === null) {
          setError(MESSAGES.ERROR.DATA_NOT_FOUND);
          return;
        }
        setData(result);
      } catch (e) {
        logger.error('useData', `Error: ${e}`);
        setError(MESSAGES.ERROR.LOAD_FAILED);
      }
    };
    load();
  }, [id]);

  return { data, error };
}
```

---

