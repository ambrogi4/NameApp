const API_URL = 'http://localhost:5000/api';

export const fetchAllPeople = async () => {
    const response = await fetch(`${API_URL}/people`);
    return await response.json();
};

export const createPerson = async (firstName, lastName, title, company, email, phone, tags, comment, city, st, ctry, LI_url) => {
    const response = await fetch(`${API_URL}/people`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            first_name: firstName, 
            last_name: lastName,
            title: title,
            company: company,
            email: email,
            phone: phone,
            tags: tags,
            comment: comment,
            city: city,
            st: st,
            ctry: ctry,
            LI_url: LI_url
        }),
    });
    return await response.json();
};

export const updatePerson = async (id, firstName, lastName, title, company, email, phone, tags, comment, city, st, ctry, LI_url) => {
    const response = await fetch(`${API_URL}/people/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            first_name: firstName, 
            last_name: lastName,
            title: title,
            company: company,
            email: email,
            phone: phone,
            tags: tags,
            comment: comment,
            city: city,
            st: st,
            ctry: ctry,
            LI_url: LI_url
        }),
    });
    return await response.json();
};

export const deletePerson = async (id) => {
    const response = await fetch(`${API_URL}/people/${id}`, {
        method: 'DELETE',
    });
    return await response.json();
};
