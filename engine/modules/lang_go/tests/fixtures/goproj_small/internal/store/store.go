package store

type Store struct {
	items []string
}

func New() *Store {
	return &Store{}
}

func (s *Store) Count() int {
	if s == nil {
		return 0
	}
	return len(s.items)
}
